"use server";
import { randomInt } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUserId, isRootAdmin } from "@/auth";
import { db } from "@/db";
import { addresses, orderEvents, orderItems, orders, payments, products, regions, users, type Address, type PendingOrderChange } from "@/db/schema";
import { formatAddress } from "@/lib/address";
import { cancelCheckout, createCheckout } from "@/lib/doku";
import { whatsappUrl } from "@/lib/contact";
import { formatRupiah } from "@/lib/format";
import { normalizePhone, phoneError } from "@/lib/phone";
import { checkoutStatuses } from "@/lib/order-status";
import { cancelActivePayments, isActivePayment } from "@/lib/payments";
import { quoteShipping, type ShippingOption } from "@/lib/shipping";

const loginRequired = "Sesi masuk berakhir. Silakan masuk kembali.";
const notCancellable = "Pesanan ini sudah tidak bisa dibatalkan. Muat ulang halaman untuk melihat statusnya.";

export async function listAddresses(): Promise<Address[]> {
  const userId = await currentUserId();
  if (!userId) return [];
  return db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.id));
}

export type AddressFormState = { error?: string; address?: Address };

/**
 * Membaca dan memvalidasi isian form alamat, dipakai untuk tambah dan ubah. Nama wilayah diambil dari tabel regions,
 * bukan dari form.
 */
async function readAddressForm(
  formData: FormData,
): Promise<{ error: string } | { values: Omit<typeof addresses.$inferInsert, "userId"> }> {
  const value = (name: string) => String(formData.get(name) ?? "").trim();
  const phone = normalizePhone(value("phone"));
  const postalCode = value("postalCode");
  if (!value("recipientName")) return { error: "Isi nama penerima." };
  if (!phone) return { error: phoneError };
  // "35.78.08.1001" -> 35, 35.78, 35.78.08, 35.78.08.1001.
  const parts = value("villageCode").split(".");
  const codes = parts.map((_, index) => parts.slice(0, index + 1).join("."));
  const found = parts.length === 4 ? await db.select().from(regions).where(inArray(regions.code, codes)) : [];
  const [province, city, district, village] = codes.map((code) => found.find((region) => region.code === code));
  if (!province || !city || !district || !village) return { error: "Pilih provinsi sampai kelurahan/desa." };
  if (!value("street")) return { error: "Isi alamat jalan dan nomor rumah." };
  if (!/^\d{5}$/.test(postalCode)) return { error: "Kode pos terdiri dari 5 angka." };
  return {
    values: {
      recipientName: value("recipientName"),
      phone,
      street: value("street"),
      village: village.name,
      district: district.name,
      city: city.name,
      province: province.name,
      villageCode: village.code,
      postalCode,
      notes: value("notes"),
    },
  };
}

export async function saveAddress(_state: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const form = await readAddressForm(formData);
  if ("error" in form) return { error: form.error };
  const [address] = await db.insert(addresses).values({ userId, ...form.values }).returning();
  return { address };
}

/**
 * Mengubah alamat milik pembeli yang sedang masuk (userId ikut di WHERE, jadi alamat orang lain tidak bisa disentuh).
 * Pesanan lama tidak terpengaruh karena alamatnya sudah disalin ke `orders` saat checkout.
 */
export async function updateAddress(id: number, _state: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const form = await readAddressForm(formData);
  if ("error" in form) return { error: form.error };
  const [address] = await db
    .update(addresses)
    .set(form.values)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning();
  if (!address) return { error: "Alamat tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  return { address };
}

export type DeleteAddressResult = { error?: string };

/** Menghapus alamat milik pembeli yang sedang masuk. Pesanan lama tidak terpengaruh (alamatnya sudah disalin). */
export async function deleteAddress(id: number): Promise<DeleteAddressResult> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const deleted = await db
    .delete(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .returning({ id: addresses.id });
  if (!deleted.length) return { error: "Alamat tidak ditemukan. Muat ulang halaman lalu coba lagi." };
  return {};
}

/** Kode pendek yang mudah dibaca dan didiktekan, mis. SK-261023-7K2P. */
async function newOrderCode() {
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "2-digit", month: "2-digit", day: "2-digit" })
    .format(new Date())
    .replaceAll("-", "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    const code = `SK-${date}-${Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("")}`;
    if (!(await db.query.orders.findFirst({ where: eq(orders.code, code), columns: { id: true } }))) return code;
  }
}

/** `stock`: produk yang stoknya kurang beserta sisa stoknya, agar keranjang di browser bisa menandai dan menyesuaikannya. */
export type PlaceOrderResult =
  | { error: string; stock?: { productId: number; available: number }[] }
  | { code: string; whatsapp: string };

/**
 * Mencatat isi keranjang sebagai satu pesanan berstatus "menunggu_konfirmasi" lalu mengembalikan tautan WhatsApp
 * berisi kode pesanan dan ID pembeli. Harga disepakati lewat WhatsApp; alamat dan ongkir diisi pembeli saat
 * checkout. Stok baru dikurangi saat pembayaran lunas (lib/stock).
 */
export async function placeOrder(input: { items: { productId: number; quantity: number }[]; notes?: string }): Promise<PlaceOrderResult> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  if (!Array.isArray(input.items) || input.items.length === 0) return { error: "Keranjang masih kosong." };
  if (input.items.length > 20) return { error: "Maksimal 20 produk dalam satu pesanan." };
  // Sesuai auth.ts, kita bisa cek role dari database atau helper isAdmin
  const userRow = await db.query.users.findFirst({ columns: { email: true, role: true }, where: eq(users.id, userId) });
  if (userRow?.role === "admin" || isRootAdmin(userRow?.email)) {
    return { error: "Admin tidak diizinkan melakukan pemesanan belanja." };
  }
  const requested = input.items.map((item) => ({ productId: Number(item.productId), quantity: Math.floor(Number(item.quantity)) }));
  if (requested.some((item) => !(item.quantity >= 1 && item.quantity <= 99))) return { error: "Jumlah barang tidak valid." };
  if (new Set(requested.map((item) => item.productId)).size !== requested.length) return { error: "Ada produk ganda di keranjang." };
  const found = await db.query.products.findMany({
    where: and(inArray(products.id, requested.map((item) => item.productId)), eq(products.published, true)),
  });
  const lines: { product: (typeof found)[number]; quantity: number }[] = [];
  const shortages: { productId: number; available: number; message: string }[] = [];
  for (const item of requested) {
    const product = found.find((product) => product.id === item.productId);
    if (!product) return { error: "Ada produk yang sudah tidak dijual. Hapus dari keranjang lalu coba lagi." };
    if (product.stock !== null && item.quantity > product.stock)
      shortages.push({
        productId: product.id,
        available: product.stock,
        message: product.stock > 0 ? `Stok ${product.name} tersisa ${product.stock}.` : `Stok ${product.name} sedang kosong.`,
      });
    lines.push({ product, quantity: item.quantity });
  }
  if (shortages.length)
    return {
      error: shortages.length === 1 ? shortages[0].message : `Stok ${shortages.length} produk berkurang. Periksa item yang ditandai di keranjang.`,
      stock: shortages.map(({ productId, available }) => ({ productId, available })),
    };

  const notes = String(input.notes ?? "").trim().slice(0, 500);
  const subtotal = lines.some((line) => line.product.price === null)
    ? null
    : lines.reduce((sum, line) => sum + line.product.price! * line.quantity, 0);
  const code = await newOrderCode();
  const orderId = await db.transaction(async (tx) => {
    const [order] = await tx.insert(orders).values({ code, userId, subtotal, notes }).returning({ id: orders.id });
    await tx.insert(orderItems).values(
      lines.map(({ product, quantity }) => ({
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
      })),
    );
    return order.id;
  });

  const message = [
    "Halo Sak Karepe, saya ingin memesan:",
    "",
    ...lines.map(
      ({ product, quantity }) =>
        `• ${product.name} × ${quantity}${product.price === null ? " (harga melalui konsultasi)" : ` — ${formatRupiah(product.price * quantity)}`}`,
    ),
    ...(lines.length > 1 && subtotal !== null ? ["", `Subtotal: ${formatRupiah(subtotal)}`] : []),
    "",
    `ID pesanan: ${orderId}`,
    `Kode pesanan: ${code}`,
    `ID pembeli: ${userId}`,
    ...(notes ? ["", `Catatan: ${notes}`] : []),
    "",
    "Mohon konfirmasi harganya. Terima kasih.",
    "",
    "⚠️ Mohon jangan menghapus atau mengubah pesan ini. ID dan kode pesanan dipakai penjual untuk memproses pesananmu.",
  ].join("\n");
  return { code, whatsapp: whatsappUrl(message) };
}

/** Pesanan milik pembeli yang sedang masuk beserta produk dan link pembayarannya. */
async function findOwnOrder(userId: number, orderId: number) {
  return db.query.orders.findFirst({
    where: and(eq(orders.id, orderId), eq(orders.userId, userId)),
    with: { user: true, items: { with: { product: { columns: { weight: true, stock: true } } } }, payments: true },
  });
}

type OwnOrder = NonNullable<Awaited<ReturnType<typeof findOwnOrder>>>;

/** Pilihan kurir untuk produk pesanan ke kode pos tujuan; harga produk memakai harga kesepakatan. */
function quoteOrder(order: OwnOrder, postalCode: string) {
  return quoteShipping(
    postalCode,
    order.items.map((item) => ({
      name: item.productName,
      price: item.price ?? 0,
      quantity: item.quantity,
      weight: item.product?.weight ?? null,
    })),
  );
}

/** Checkout dibuka setelah admin mengisi harga, dan bisa diulang bila link DOKU sebelumnya kedaluwarsa atau dibatalkan. */
const notCheckoutable = "Pesanan ini belum atau sudah tidak bisa di-checkout. Muat ulang halaman untuk melihat statusnya.";

export type ShippingQuoteResult = { error: string } | { options: ShippingOption[] };

/** Pilihan kurir dan ongkir ke alamat yang dipilih, untuk dipilih pembeli sebelum membayar. */
export async function quoteOrderShipping(orderId: number, addressId: number): Promise<ShippingQuoteResult> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const [order, address] = await Promise.all([
    findOwnOrder(userId, orderId),
    db.query.addresses.findFirst({ where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)) }),
  ]);
  if (!order) return { error: notCheckoutable };
  if (!address) return { error: "Pilih alamat pengiriman." };
  const quote = await quoteOrder(order, address.postalCode);
  return quote.ok ? { options: quote.options } : { error: quote.error };
}

/** Link berlaku 24 jam agar pembeli sempat membayar. */
const dueMinutes = 24 * 60;

export type CheckoutOrderResult = { error: string } | { url: string };

/**
 * Menyalin alamat dan kurir pilihan ke pesanan, lalu membuat link DOKU Checkout dan mengubah status menjadi
 * "menunggu_pembayaran". Ongkir diambil ulang dari Biteship, bukan dari browser. Bila link sebelumnya masih
 * berlaku, link itu yang dikembalikan.
 */
export async function checkoutOrder(
  orderId: number,
  addressId: number,
  courier: { courierCode: string; serviceCode: string },
): Promise<CheckoutOrderResult> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const [order, address] = await Promise.all([
    findOwnOrder(userId, orderId),
    db.query.addresses.findFirst({ where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)) }),
  ]);
  if (!order || order.payments.some((payment) => payment.paidAt)) return { error: notCheckoutable };
  if (order.status !== "menunggu_checkout" && order.status !== "menunggu_pembayaran") return { error: notCheckoutable };
  // Stok baru dikurangi saat lunas; dicek lagi di sini karena bisa habis dibeli orang lain sejak pesanan dibuat,
  // termasuk sebelum link lama yang masih aktif dikembalikan.
  const short = order.items.find((item) => item.product?.stock != null && item.quantity > item.product.stock);
  if (short)
    return {
      error: short.product!.stock
        ? `Stok ${short.productName} tersisa ${short.product!.stock}. Hubungi Sak Karepe lewat WhatsApp untuk mengubah pesanan.`
        : `Stok ${short.productName} sudah habis. Hubungi Sak Karepe lewat WhatsApp untuk mengubah pesanan.`,
    };
  const active = order.payments.find((payment) => isActivePayment(payment));
  if (order.status === "menunggu_pembayaran" && active) return { url: active.url };
  if (order.items.some((item) => item.price === null)) return { error: notCheckoutable };
  if (!address) return { error: "Pilih alamat pengiriman." };

  const quote = await quoteOrder(order, address.postalCode);
  if (!quote.ok) return { error: quote.error };
  const option = quote.options.find(
    (option) => option.courierCode === courier.courierCode && option.serviceCode === courier.serviceCode,
  );
  if (!option) return { error: "Layanan kurir itu tidak tersedia untuk alamat ini. Pilih kurir lain." };
  const shippingCost = option.price;
  const subtotal = order.items.reduce((sum, item) => sum + item.price! * item.quantity, 0);
  const amount = subtotal + shippingCost;
  const lineItems = order.items.map((item) => ({
    id: String(item.productId ?? `item${item.id}`),
    name: item.productName.slice(0, 255),
    price: item.price!,
    quantity: item.quantity,
  }));
  if (shippingCost) lineItems.push({ id: "ongkir", name: "Ongkos kirim", price: shippingCost, quantity: 1 });
  const shippingAddress = formatAddress(address);
  const fullAddress = address.notes ? `${shippingAddress} (${address.notes})` : shippingAddress;
  // Tanpa simbol agar diterima semua kanal pembayaran (KKI), mis. SK261023Y7D3P1.
  const invoiceNumber = `${order.code.replace(/[^A-Z0-9]/g, "")}P${order.payments.length + 1}`;
  const result = await createCheckout({
    invoiceNumber,
    amount,
    lineItems,
    dueMinutes,
    customer: {
      id: String(userId),
      name: address.recipientName.replace(/[^\p{L} ]/gu, "").trim().slice(0, 255),
      // findOwnOrder mencocokkan userId, jadi akun pembeli selalu ada.
      email: order.user!.email,
      phone: address.phone.replace(/^0/, "62"),
      address: fullAddress.slice(0, 400),
      postcode: address.postalCode,
    },
  });
  if (!result.ok) {
    console.warn(`[doku] Link ${invoiceNumber} pesanan ${order.code} gagal dibuat: ${result.error}`);
    return { error: `Link pembayaran belum bisa dibuat. ${result.error}` };
  }
  // Status dan updatedAt ikut dicek agar pembatalan atau ubah harga yang masuk selama link DOKU dibuat tidak tertimpa.
  const saved = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(orders)
      .set({
        recipientName: address.recipientName,
        phone: address.phone,
        shippingAddress: fullAddress,
        postalCode: address.postalCode,
        subtotal,
        shippingCost,
        courierCode: option.courierCode,
        courierServiceCode: option.serviceCode,
        courierName: option.name,
        status: "menunggu_pembayaran",
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, orderId), eq(orders.status, order.status), eq(orders.updatedAt, order.updatedAt)))
      .returning({ id: orders.id });
    if (updated) {
      await tx
        .insert(payments)
        .values({ orderId, invoiceNumber, amount, url: result.url, expiresAt: result.expiresAt, requestId: result.requestId });
      if (order.status !== "menunggu_pembayaran")
        await tx
          .insert(orderEvents)
          .values({ orderId, fromStatus: order.status, toStatus: "menunggu_pembayaran", source: "pembeli", userId });
    }
    return updated;
  });
  if (!saved) {
    // Link DOKU baru tidak dicatat, jadi dibatalkan agar tidak bisa dibayar.
    const cancel = await cancelCheckout(invoiceNumber, result.requestId, `Pesanan berubah saat checkout (${order.code})`);
    if (!cancel.ok) console.warn(`[doku] Link ${invoiceNumber} tidak tercatat dan gagal dibatalkan: ${cancel.error}`);
    return { error: notCheckoutable };
  }
  revalidatePath("/pesanan", "layout");
  revalidatePath("/admin", "layout");
  return { url: result.url };
}

export type CancelOrderState = { error?: string };

/**
 * Pembeli hanya bisa membatalkan pesanannya sendiri selama belum dibayar. Link DOKU yang masih berlaku dibatalkan
 * lebih dulu lewat Cancel Order API; bila DOKU menolak (mis. metode selain VA/QRIS), pesanan tidak dibatalkan.
 */
export async function cancelOrder(id: number): Promise<CancelOrderState> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.id, id), eq(orders.userId, userId)),
    with: { payments: true },
  });
  if (!order || !checkoutStatuses.includes(order.status) || order.payments.some((p) => p.paidAt)) return { error: notCancellable };
  const cancelError = await cancelActivePayments(order.payments, `Dibatalkan pembeli (${order.code})`);
  if (cancelError) return { error: `Pesanan tidak dibatalkan. ${cancelError} Hubungi Sak Karepe lewat WhatsApp.` };
  // Status ikut dicek di WHERE agar pembayaran yang baru masuk tidak ikut terbatalkan dan riwayat mencatat status asal yang benar.
  const cancelled = await db.transaction(async (tx) => {
    const [cancelled] = await tx
      .update(orders)
      .set({ status: "dibatalkan", updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.userId, userId), eq(orders.status, order.status)))
      .returning({ id: orders.id });
    if (cancelled)
      await tx.insert(orderEvents).values({ orderId: id, fromStatus: order.status, toStatus: "dibatalkan", source: "pembeli", userId });
    return cancelled;
  });
  revalidatePath("/pesanan", "layout");
  revalidatePath("/admin", "layout");
  return cancelled ? {} : { error: notCancellable };
}

/** Pembeli mengonfirmasi paket sudah diterima, setelah kurir melaporkan paket sampai. */
export async function confirmReceived(id: number): Promise<CancelOrderState> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const done = await db.transaction(async (tx) => {
    const [done] = await tx
      .update(orders)
      .set({ status: "selesai", updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.userId, userId), eq(orders.status, "sampai")))
      .returning({ id: orders.id });
    if (done) await tx.insert(orderEvents).values({ orderId: id, fromStatus: "sampai", toStatus: "selesai", source: "pembeli", userId });
    return done;
  });
  revalidatePath("/pesanan", "layout");
  revalidatePath("/admin", "layout");
  return done ? {} : { error: "Pesanan ini belum sampai atau sudah selesai. Muat ulang halaman untuk melihat statusnya." };
}

export type ChangePaidAddressResult = { error?: string; success?: boolean; priceDiff?: number };

type AddressChangeInput = { orderId: number; addressId: number; courier: { courierCode: string; serviceCode: string } };

/** Validasi bersama ubah alamat setelah bayar: pesanan "dibayar" milik pembeli, kurir belum dipesan, kurir tersedia. */
async function prepareAddressChange(userId: number, input: AddressChangeInput) {
  const [order, address] = await Promise.all([
    findOwnOrder(userId, input.orderId),
    db.query.addresses.findFirst({ where: and(eq(addresses.id, input.addressId), eq(addresses.userId, userId)) }),
  ]);
  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (order.status !== "dibayar")
    return { error: "Alamat hanya bisa diubah untuk pesanan yang sudah dibayar dan belum dikirim." };
  if (order.shipmentId) return { error: "Alamat tidak bisa diubah setelah booking kurir." };
  if (!address) return { error: "Pilih alamat pengiriman." };

  const quote = await quoteOrder(order, address.postalCode);
  if (!quote.ok) return { error: quote.error };
  const option = quote.options.find(
    (opt) => opt.courierCode === input.courier.courierCode && opt.serviceCode === input.courier.serviceCode,
  );
  if (!option) return { error: "Layanan kurir tersebut tidak tersedia untuk alamat ini. Pilih kurir lain." };

  const shippingAddress = formatAddress(address);
  const change: PendingOrderChange = {
    recipientName: address.recipientName,
    phone: address.phone,
    shippingAddress: address.notes ? `${shippingAddress} (${address.notes})` : shippingAddress,
    postalCode: address.postalCode,
    courierCode: option.courierCode,
    courierServiceCode: option.serviceCode,
    courierName: option.name,
    shippingCost: option.price,
  };
  return { order, change, diff: option.price - (order.shippingCost ?? 0) };
}

/**
 * Pembeli mengubah alamat dan kurir setelah pesanan dibayar, selama kurir belum dipesan (`!order.shipmentId`).
 * Ongkir dihitung ulang dengan quoteShipping.
 * - Bila ongkir baru <= ongkir lama: perubahan langsung disimpan. Bila lebih hemat, pesanan ditandai "Perlu dicek" untuk refund.
 * - Bila ongkir baru > ongkir lama: mengembalikan info selisih agar pembeli bisa membayar selisih lewat DOKU atau hubungi admin.
 */
export async function changePaidOrderAddress(input: AddressChangeInput): Promise<ChangePaidAddressResult> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const prepared = await prepareAddressChange(userId, input);
  if (!prepared.order) return { error: prepared.error };
  const { order, change, diff } = prepared;

  if (diff > 0) {
    return {
      error: `Ongkos kirim ke alamat ini lebih tinggi sebesar ${formatRupiah(diff)}. Bayar selisih lewat DOKU atau konfirmasi dengan admin via WhatsApp.`,
      priceDiff: diff,
    };
  }

  const refundNote = `Pembeli mengubah alamat; selisih ongkir lebih hemat ${formatRupiah(-diff)} dicatat untuk penanganan admin/refund.`;
  const saved = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(orders)
      .set({
        ...change,
        // Ditambahkan, bukan menimpa, agar catatan "Perlu dicek" sebelumnya tidak hilang.
        ...(diff < 0 && { reviewNote: [order.reviewNote, refundNote].filter(Boolean).join(" · ") }),
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, input.orderId), eq(orders.status, "dibayar"), isNull(orders.shipmentId)))
      .returning({ id: orders.id });

    if (updated) {
      await tx.insert(orderEvents).values({
        orderId: input.orderId,
        source: "pembeli",
        userId,
        note:
          diff < 0
            ? `Alamat pengiriman diubah pembeli ke ${change.recipientName}, ${change.shippingAddress} (${change.courierName}). Ongkir baru ${formatRupiah(change.shippingCost)} (lebih hemat ${formatRupiah(-diff)}). Selisih dicatat untuk refund/kebijakan admin.`
            : `Alamat pengiriman diubah pembeli ke ${change.recipientName}, ${change.shippingAddress} (${change.courierName}). Ongkir tetap ${formatRupiah(change.shippingCost)}.`,
      });
    }
    return updated;
  });

  if (!saved) return { error: "Pesanan sudah berubah atau resi sudah dibuat. Alamat tidak bisa diubah." };

  revalidatePath("/pesanan", "layout");
  revalidatePath("/admin", "layout");
  return { success: true };
}

export type PayShippingDiffResult = { error: string } | { url: string };

/**
 * Membuat link pembayaran DOKU untuk selisih ongkir yang lebih mahal saat pembeli mengubah alamat. Alamat baru disimpan
 * di pembayaran (`pendingChange`) dan baru diterapkan ke pesanan oleh `applyPayment` setelah lunas.
 */
export async function payShippingDifference(input: AddressChangeInput): Promise<PayShippingDiffResult> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const prepared = await prepareAddressChange(userId, input);
  if (!prepared.order) return { error: prepared.error };
  const { order, change, diff } = prepared;
  if (diff <= 0) return { error: "Tidak ada selisih biaya ongkir yang perlu dibayar." };

  // Link selisih sebelumnya dibatalkan agar pembeli tidak membayar dua perubahan alamat.
  const cancelError = await cancelActivePayments(order.payments, `Diganti perubahan alamat baru (${order.code})`);
  if (cancelError) return { error: `Link selisih ongkir sebelumnya belum bisa dibatalkan. ${cancelError}` };

  const invoiceNumber = `${order.code.replace(/[^A-Z0-9]/g, "")}S${order.payments.length + 1}`;
  const result = await createCheckout({
    invoiceNumber,
    amount: diff,
    lineItems: [{ id: "selisih_ongkir", name: `Selisih ongkir (${change.courierName})`, price: diff, quantity: 1 }],
    dueMinutes,
    customer: {
      id: String(userId),
      name: change.recipientName.replace(/[^\p{L} ]/gu, "").trim().slice(0, 255),
      email: order.user!.email,
      phone: change.phone.replace(/^0/, "62"),
      address: change.shippingAddress.slice(0, 400),
      postcode: change.postalCode,
    },
  });

  if (!result.ok) {
    console.warn(`[doku] Link selisih ongkir ${invoiceNumber} pesanan ${order.code} gagal dibuat: ${result.error}`);
    return { error: `Link pembayaran selisih ongkir belum bisa dibuat. ${result.error}` };
  }

  await db.transaction(async (tx) => {
    await tx.insert(payments).values({
      orderId: input.orderId,
      invoiceNumber,
      amount: diff,
      url: result.url,
      expiresAt: result.expiresAt,
      requestId: result.requestId,
      pendingChange: change,
    });
    await tx.insert(orderEvents).values({
      orderId: input.orderId,
      source: "pembeli",
      userId,
      note: `Pembeli ingin mengubah alamat ke ${change.recipientName}, ${change.shippingAddress} (${change.courierName}). Dibuat link DOKU untuk selisih ongkir ${formatRupiah(diff)} (${invoiceNumber}); alamat berubah setelah lunas.`,
    });
  });

  revalidatePath("/pesanan", "layout");
  revalidatePath("/admin", "layout");
  return { url: result.url };
}
