"use server";
import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { orderEvents, orderItems, orders, type Order, type OrderItem } from "@/db/schema";
import { parseAmount } from "@/lib/format";
import { adminTransitions, checkoutStatuses, isOrderStatus, orderStatusLabels } from "@/lib/order-status";
import { checkStatus } from "@/lib/doku";
import { applyPayment, cancelActivePayments } from "@/lib/payments";
import { refreshShipment, saveResend } from "@/lib/shipments";
import { createShipment, lowBalance, unreachable } from "@/lib/shipping";

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
    if (order.payments.some((payment) => payment.paidAt)) return { error: "Pesanan ini sudah dibayar; pembatalan harus lewat refund." };
    // Link DOKU yang masih berlaku dibatalkan dulu agar pembeli tidak membayar pesanan yang sudah batal.
    const cancelError = await cancelActivePayments(order.payments, `Dibatalkan admin (${order.code})`);
    if (cancelError) return { error: `Pesanan tidak dibatalkan. ${cancelError}` };
  }
  const saved = await db.transaction(async (tx) => {
    const [saved] = await tx
      .update(orders)
      .set({ status, updatedAt: new Date(), ...(status === "sampai" && { deliveredAt: new Date() }) })
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

export type ShipmentFormState = { error?: string; topUp?: boolean };

/** Hanya galat jaringan/5xx yang bisa menyisakan order di Biteship; penolakan 4xx (mis. saldo kurang) tidak membuat order. */
const bookingError = (error: string): ShipmentFormState => ({
  error: `Kurir belum bisa dipesan. ${error}${error === unreachable ? " Bila order ini sudah muncul di dashboard Biteship, batalkan dulu di sana." : ""}`,
  topUp: error === lowBalance,
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
    with: { items: { with: { product: { columns: { weight: true } } } } },
  });
  if (!order || order.status !== "dibayar" || order.shipmentId) return { error: "Resi hanya bisa dibuat sekali untuk pesanan yang sudah dibayar." };
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

/** Pesanan gagal kirim yang tidak dikirim ulang dibatalkan dan masuk alur refund. */
export async function refundFailedShipment(orderId: number): Promise<ShipmentFormState> {
  const admin = await requireAdmin();
  const saved = await db.transaction(async (tx) => {
    const [saved] = await tx
      .update(orders)
      .set({ status: "refund", updatedAt: new Date() })
      .where(and(eq(orders.id, orderId), eq(orders.status, "gagal_kirim")))
      .returning({ id: orders.id });
    if (saved)
      await tx.insert(orderEvents).values({ orderId, fromStatus: "gagal_kirim", toStatus: "refund", source: "admin", userId: Number(admin.id) });
    return saved;
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return saved ? {} : { error: "Status pesanan baru saja berubah. Muat ulang halaman lalu coba lagi." };
}

/**
 * Cek ulang status pembayaran (DOKU) dan pengiriman (Biteship) bila webhook tidak sampai. Semua link yang belum lunas
 * dicek, termasuk yang sudah kedaluwarsa atau dibatalkan, karena pembayaran bisa masuk tepat sebelumnya.
 */
export async function recheckOrder(orderId: number): Promise<StatusFormState> {
  await requireAdmin();
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { payments: true } });
  if (!order) return { error: "Pesanan tidak ditemukan." };
  const errors: string[] = [];
  for (const payment of order.payments) {
    if (payment.paidAt || !payment.invoiceNumber) continue;
    const result = await checkStatus(payment.invoiceNumber);
    if (result.ok) await applyPayment(result.status);
    else errors.push(`${payment.invoiceNumber}: ${result.error}`);
  }
  if (order.shipmentId) {
    const result = await refreshShipment(order);
    if (!result.ok) errors.push(`Biteship: ${result.error}`);
  }
  // Seluruh situs: pembayaran yang baru tercatat bisa menghabiskan stok produk di etalase.
  revalidatePath("/", "layout");
  return errors.length ? { error: `Sebagian status belum bisa dicek. ${errors.join(" · ")}` } : {};
}

export type NoteFormState = { error?: string };

/** Catatan internal admin di riwayat pesanan; tidak pernah ditampilkan ke pembeli. */
export async function addOrderNote(orderId: number, _state: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const admin = await requireAdmin();
  const note = String(formData.get("note") ?? "").trim();
  if (!note) return { error: "Tulis catatannya dulu." };
  if (note.length > 2000) return { error: "Catatan maksimal 2000 karakter." };
  await db.insert(orderEvents).values({ orderId, source: "admin", userId: Number(admin.id), note });
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
  if (prices.some((price) => !price)) return { error: "Isi harga setiap produk." };
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
