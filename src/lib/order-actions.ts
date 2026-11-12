"use server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { orderEvents, orderItems, orders, type Order, type OrderItem } from "@/db/schema";
import { formatRupiah, parseAmount } from "@/lib/format";
import { adminTransitions, checkoutStatuses, isOrderStatus, orderStatusLabels } from "@/lib/order-status";
import { cancelActivePayments, isActivePayment } from "@/lib/payments";
import { saveResend } from "@/lib/shipments";
import { createShipment, lowBalance, quotaReached, unreachable } from "@/lib/shipping";
import { returnStock } from "@/lib/stock";

export type StatusFormState = { error?: string };

/**
 * Admin mengubah status lewat dropdown, hanya untuk perpindahan di `adminTransitions`. Status lama ikut dicek di WHERE
 * agar tidak menimpa perubahan dari webhook atau pembeli yang masuk bersamaan.
 */
export async function updateOrderStatus(id: number, _state: StatusFormState, formData: FormData): Promise<StatusFormState> {
  const admin = await requireAdmin();
  const status = formData.get("status");
  const order = await db.query.orders.findFirst({ where: eq(orders.id, id), with: { payments: true } });
  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (!isOrderStatus(status) || !adminTransitions[order.status]?.includes(status))
    return {
      error: `Status "${orderStatusLabels[order.status]}" tidak bisa diubah ke "${isOrderStatus(status) ? orderStatusLabels[status] : status}" dari sini.`,
    };
  if (status === "dibatalkan") {
    // Pesanan yang sudah dibayar hanya bisa dibatalkan lewat refund. Dari status "refund" (dana sudah dikembalikan) boleh.
    if (order.status !== "refund" && order.payments.some((payment) => payment.paidAt))
      return { error: "Pesanan ini sudah dibayar; pembatalan harus lewat refund." };
    // Link DOKU yang masih berlaku dibatalkan dulu agar pembeli tidak membayar pesanan yang sudah batal.
    const cancelError = await cancelActivePayments(order.payments, `Dibatalkan admin (${order.code})`);
    if (cancelError) return { error: `Pesanan tidak dibatalkan. ${cancelError}` };
  }
  const saved = await db.transaction(async (tx) => {
    const [saved] = await tx
      .update(orders)
      .set({ status, updatedAt: new Date(), ...(status === "sampai" && order.status !== "retur" && { deliveredAt: new Date() }) })
      .where(and(eq(orders.id, id), eq(orders.status, order.status)))
      .returning({ id: orders.id });
    if (saved)
      await tx.insert(orderEvents).values({ orderId: id, fromStatus: order.status, toStatus: status, source: "admin", userId: Number(admin.id) });
    return saved;
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return saved ? {} : { error: "Status pesanan baru saja berubah. Muat ulang halaman lalu coba lagi." };
}

export type ShipmentFormState = { error?: string; dashboard?: boolean };

/** Hanya gangguan yang bisa menyisakan order di Biteship; penolakan (mis. saldo kurang, kuota habis) tidak membuat order. */
const bookingError = (error: string): ShipmentFormState => ({
  error: `Kurir belum bisa dipesan. ${error}${error === unreachable ? " Bila order ini sudah muncul di dashboard Biteship, batalkan dulu di sana." : ""}`,
  dashboard: error === lowBalance || error === quotaReached,
});

/** Booking kurir pilihan pembeli di Biteship ke alamat pesanan; dipakai untuk resi pertama dan kirim ulang. */
const bookCourier = (
  order: Order & { items: (OrderItem & { product: { weight: number | null } | null })[] },
  method: "pickup" | "drop_off",
) =>
  createShipment({
    reference: `${order.code}-${Date.now().toString(36).toUpperCase()}`,
    method,
    courierCode: order.courierCode!,
    serviceCode: order.courierServiceCode!,
    destination: { name: order.recipientName ?? "", phone: order.phone ?? "", address: order.shippingAddress!, postalCode: order.postalCode! },
    items: order.items.map((item) => ({
      name: item.productName,
      price: item.price ?? 0,
      quantity: item.quantity,
      weight: item.product?.weight ?? null,
    })),
  });

/**
 * Memesan kurir pilihan pembeli di Biteship untuk pesanan yang sudah dibayar, menyimpan resinya, dan mengubah status
 * menjadi "dikirim". Perjalanan paket berikutnya diikuti dari webhook Biteship (lib/shipments).
 */
export async function bookShipment(orderId: number, _state: ShipmentFormState, formData: FormData): Promise<ShipmentFormState> {
  const admin = await requireAdmin();
  const method = formData.get("method");
  if (method !== "pickup" && method !== "drop_off") return { error: "Pilih cara penyerahan paket ke kurir." };
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { with: { product: { columns: { weight: true } } } }, payments: true },
  });
  if (!order || order.status !== "dibayar" || order.shipmentId) return { error: "Resi hanya bisa dibuat sekali untuk pesanan yang sudah dibayar." };
  if (order.payments.some((payment) => payment.pendingChange && isActivePayment(payment)))
    return { error: "Pembeli sedang membayar selisih ongkir untuk alamat baru. Tunggu sampai lunas atau link kedaluwarsa." };
  if (!order.courierCode || !order.courierServiceCode || !order.shippingAddress || !order.postalCode)
    return { error: "Pesanan ini belum punya alamat atau kurir pilihan pembeli." };
  const result = await bookCourier(order, method);
  if (!result.ok) {
    console.warn(`[biteship] Kurir pesanan ${order.code} gagal dipesan: ${result.error}`);
    return bookingError(result.error);
  }
  const saved = await db.transaction(async (tx) => {
    const [saved] = await tx
      .update(orders)
      .set({
        status: "dikirim",
        shipmentId: result.id,
        shipmentStatus: result.status,
        waybillId: result.waybillId,
        trackingUrl: result.trackingUrl,
        collectionMethod: method,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, "dibayar"), isNull(orders.shipmentId)))
      .returning({ id: orders.id });
    if (saved)
      await tx.insert(orderEvents).values({ orderId, fromStatus: "dibayar", toStatus: "dikirim", source: "admin", userId: Number(admin.id) });
    return saved;
  });
  if (!saved) {
    console.warn(`[biteship] Order ${result.id} ganda untuk pesanan ${order.code}; batalkan di dashboard Biteship`);
    return { error: `Pesanan berubah atau resi sudah dibuat dari tab lain. Batalkan order ${result.id} di dashboard Biteship karena ganda.` };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return {};
}

/**
 * Kirim ulang pesanan "gagal_kirim": admin mengonfirmasi atau mengubah alamat, lalu kurir yang sama dipesan lagi. Resi lama
 * dipindah ke `shipmentHistory` beserta siapa yang menanggung ongkir kedua.
 */
export async function resendShipment(orderId: number, _state: ShipmentFormState, formData: FormData): Promise<ShipmentFormState> {
  const admin = await requireAdmin();
  const method = formData.get("method");
  const paidBy = formData.get("paidBy");
  const [recipientName, rawPhone, shippingAddress, postalCode] = ["recipientName", "phone", "shippingAddress", "postalCode"].map((key) =>
    String(formData.get(key) ?? "").trim(),
  );
  const phone = rawPhone.replace(/\D/g, "").replace(/^62/, "0");
  if (method !== "pickup" && method !== "drop_off") return { error: "Pilih cara penyerahan paket ke kurir." };
  if (paidBy !== "pembeli" && paidBy !== "sak_karepe") return { error: "Pilih siapa yang menanggung ongkir pengiriman ulang." };
  if (!recipientName || !shippingAddress) return { error: "Isi nama penerima dan alamat." };
  if (!/^0\d{8,13}$/.test(phone)) return { error: "Nomor HP tidak valid. Contoh: 081234567890." };
  if (!/^\d{5}$/.test(postalCode)) return { error: "Kode pos terdiri dari 5 angka." };
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { with: { product: { columns: { weight: true } } } } },
  });
  if (!order || order.status !== "gagal_kirim" || !order.shipmentId) return { error: "Kirim ulang hanya untuk pesanan yang gagal kirim." };
  if (!order.courierCode || !order.courierServiceCode) return { error: "Pesanan ini belum punya kurir pilihan pembeli." };
  const result = await bookCourier({ ...order, recipientName, phone, shippingAddress, postalCode }, method);
  if (!result.ok) {
    console.warn(`[biteship] Kurir pesanan ${order.code} gagal dipesan: ${result.error}`);
    return bookingError(result.error);
  }
  const saved = await saveResend(order, { recipientName, phone, shippingAddress, postalCode }, method, paidBy, result, Number(admin.id));
  if (!saved) {
    console.warn(`[biteship] Order ${result.id} ganda untuk pesanan ${order.code}; batalkan di dashboard Biteship`);
    return { error: `Pesanan berubah atau sudah dikirim ulang dari tab lain. Batalkan order ${result.id} di dashboard Biteship karena ganda.` };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return {};
}

/** Pesanan yang bisa di-refund admin: dibayar (kurir belum dipesan), gagal kirim, atau retur yang komplainnya disetujui. */
const refundable = (order: Pick<Order, "status" | "shipmentId">) =>
  order.status === "gagal_kirim" || order.status === "retur" || (order.status === "dibayar" && !order.shipmentId);

/**
 * Admin membatalkan pesanan yang sudah dibayar lewat refund (lihat `refundable`); pesanan "dikirim" tidak bisa di-refund dari
 * sini. Dana dikembalikan manual oleh admin, lalu status diubah ke "dibatalkan" lewat dropdown (refund -> dibatalkan).
 *
 * Status dibaca dan diubah di satu transaksi "immediate", dan stok dikembalikan di transaksi yang sama hanya bila status
 * benar-benar berpindah ke "refund". Klik ganda atau dua tab yang bersamaan karenanya tidak mengembalikan stok dua kali.
 * Stok retur tidak dikembalikan otomatis karena barangnya belum tentu layak dijual lagi; admin menyesuaikannya di produk.
 * Link DOKU yang masih berlaku (mis. tagihan selisih ongkir) dibatalkan lebih dulu agar pembeli tidak membayar pesanan
 * yang sudah di-refund.
 */
export async function refundOrder(orderId: number): Promise<ShipmentFormState> {
  const admin = await requireAdmin();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { payments: true } });
  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (!refundable(order))
    return { error: "Refund hanya untuk pesanan yang sudah dibayar dan belum dikirim, yang paketnya gagal kirim, atau retur." };
  const cancelError = await cancelActivePayments(order.payments, `Pesanan di-refund admin (${order.code})`);
  if (cancelError) return { error: `Pesanan belum di-refund. ${cancelError}` };
  const paid = order.payments.filter((payment) => payment.paidAt).reduce((sum, payment) => sum + payment.amount, 0);

  const saved = await db.transaction(
    async (tx) => {
      const current = await tx.query.orders.findFirst({ columns: { status: true, shipmentId: true }, where: eq(orders.id, orderId) });
      if (!current || !refundable(current)) return false;
      const [updated] = await tx
        .update(orders)
        .set({ status: "refund", updatedAt: new Date() })
        .where(and(eq(orders.id, orderId), eq(orders.status, current.status)))
        .returning({ id: orders.id });
      if (!updated) return false;
      await tx.insert(orderEvents).values({
        orderId,
        fromStatus: current.status,
        toStatus: "refund",
        source: "admin",
        userId: Number(admin.id),
        note: `Dana ${formatRupiah(paid)} perlu dikembalikan ke pembeli. ${current.status === "retur" ? "Stok retur tidak dikembalikan otomatis." : "Stok dikembalikan."}`,
      });
      if (current.status !== "retur") await returnStock(tx, orderId);
      return true;
    },
    { behavior: "immediate" },
  );
  // Stok kembali tersedia di etalase.
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return saved ? {} : { error: "Status pesanan baru saja berubah, atau paketnya sudah dikirim. Muat ulang halaman lalu coba lagi." };
}

export type NoteFormState = { error?: string };

/** Catatan internal admin di riwayat pesanan; tidak pernah ditampilkan ke pembeli. */
export async function addOrderNote(orderId: number, _state: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Tulis catatannya dulu." };
  if (note.length > 2000) return { error: "Catatan maksimal 2000 karakter." };
  await db.insert(orderEvents).values({ orderId, source: "admin", userId: Number(admin.id), note });
  // Catatan dihitung aktivitas agar pesanan yang masih dibahas tidak dibatalkan otomatis (cancelExpiredOrders). Hanya
  // pesanan belum dibayar: updatedAt pesanan "dikirim" menandai awal on_hold (stuckOnHoldOrders).
  await db.update(orders).set({ updatedAt: new Date() }).where(and(eq(orders.id, orderId), inArray(orders.status, checkoutStatuses)));
  revalidatePath(`/admin/pesanan/${orderId}`);
  return {};
}

/** Admin selesai menangani pesanan yang ditandai "Perlu dicek". */
export async function markReviewed(orderId: number): Promise<StatusFormState> {
  await requireAdmin();
  await db.update(orders).set({ reviewNote: null }).where(eq(orders.id, orderId));
  revalidatePath("/admin", "layout");
  return {};
}

export type UpdateAddressFormState = { error?: string; saved?: boolean };

/**
 * Admin mengubah alamat tujuan pengiriman sebelum kurir dipesan (sebelum `shipmentId` terisi).
 * Perubahan dicatat di riwayat pesanan (orderEvents).
 */
export async function updateOrderAddress(
  orderId: number,
  _state: UpdateAddressFormState,
  formData: FormData,
): Promise<UpdateAddressFormState> {
  const admin = await requireAdmin();
  const [recipientName, rawPhone, shippingAddress, postalCode] = [
    "recipientName",
    "phone",
    "shippingAddress",
    "postalCode",
  ].map((key) => String(formData.get(key) ?? "").trim());
  const phone = rawPhone.replace(/\D/g, "").replace(/^62/, "0");
  if (!recipientName || !shippingAddress) return { error: "Isi nama penerima dan alamat." };
  if (!/^0\d{8,13}$/.test(phone)) return { error: "Nomor HP tidak valid. Contoh: 081234567890." };
  if (!/^\d{5}$/.test(postalCode)) return { error: "Kode pos terdiri dari 5 angka." };

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (order.shipmentId) return { error: "Alamat tidak bisa diubah setelah booking kurir." };

  const oldAddress = [order.recipientName, order.phone, order.shippingAddress, order.postalCode].filter(Boolean).join(", ");
  const newAddress = `${recipientName} (${phone}) - ${shippingAddress} ${postalCode}`;

  const saved = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(orders)
      .set({
        recipientName,
        phone,
        shippingAddress,
        postalCode,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), isNull(orders.shipmentId)))
      .returning({ id: orders.id });
    if (updated) {
      await tx.insert(orderEvents).values({
        orderId,
        source: "admin",
        userId: Number(admin.id),
        note: `Alamat pengiriman diubah oleh admin.\nDari: ${oldAddress || "—"}\nMenjadi: ${newAddress}`,
      });
    }
    return updated;
  });

  if (!saved) return { error: "Pesanan sudah berubah atau resi sudah dibuat dari tab lain." };

  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return { saved: true };
}

export type CheckoutLinkFormState = { error?: string; saved?: boolean };


/**
 * Menyimpan harga kesepakatan lalu membuka checkout untuk pembeli (status "menunggu_checkout"). Ongkir dan link DOKU
 * dibuat saat pembeli mengisi alamat di /pesanan/[code]/checkout. Link DOKU lama yang masih berlaku dibatalkan agar
 * pembeli tidak membayar harga lama.
 */
export async function createCheckoutLink(
  orderId: number,
  _state: CheckoutLinkFormState,
  formData: FormData,
): Promise<CheckoutLinkFormState> {
  const admin = await requireAdmin();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true, payments: true } });
  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (!checkoutStatuses.includes(order.status) || order.payments.some((payment) => payment.paidAt))
    return { error: "Link checkout hanya bisa dibuat untuk pesanan yang belum dibayar." };
  const prices = order.items.map((item) => parseAmount(formData.get(`price-${item.id}`)));
  if (prices.some((price) => price === null || price <= 0)) return { error: "Isi harga setiap produk dengan nilai lebih dari Rp0." };
  const subtotal = order.items.reduce((sum, item, index) => sum + prices[index]! * item.quantity, 0);
  if (subtotal > 999_999_999_999) return { error: "Total terlalu besar." };
  const cancelError = await cancelActivePayments(order.payments, `Harga diubah admin (${order.code})`);
  if (cancelError) return { error: `Link pembayaran lama belum dibatalkan. ${cancelError}` };
  await db.transaction(async (tx) => {
    for (const [index, item] of order.items.entries())
      await tx.update(orderItems).set({ price: prices[index] }).where(eq(orderItems.id, item.id));
    await tx
      .update(orders)
      .set({ subtotal, shippingCost: null, status: "menunggu_checkout", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    if (order.status !== "menunggu_checkout")
      await tx
        .insert(orderEvents)
        .values({ orderId, fromStatus: order.status, toStatus: "menunggu_checkout", source: "admin", userId: Number(admin.id) });
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return { saved: true };
}
