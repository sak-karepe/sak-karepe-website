"use server";
import { randomInt } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/db";
import { addresses, orderItems, orders, payments, products, regions, type Address } from "@/db/schema";
import { formatAddress } from "@/lib/address";
import { cancelCheckout, createCheckout } from "@/lib/doku";
import { whatsappUrl } from "@/lib/contact";
import { formatRupiah } from "@/lib/format";
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

/** "0812-3456 789" atau "+62 812..." menjadi 08123456789; null bila bukan nomor Indonesia yang wajar. */
function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^62/, "0");
  return /^0\d{8,13}$/.test(digits) ? digits : null;
}

export async function saveAddress(_state: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const value = (name: string) => String(formData.get(name) ?? "").trim();
  const phone = normalizePhone(value("phone"));
  const postalCode = value("postalCode");
  if (!value("recipientName")) return { error: "Isi nama penerima." };
  if (!phone) return { error: "Nomor HP tidak valid. Contoh: 081234567890." };
  // Nama wilayah diambil dari tabel regions, bukan dari form: "35.78.08.1001" -> 35, 35.78, 35.78.08, 35.78.08.1001.
  const parts = value("villageCode").split(".");
  const codes = parts.map((_, index) => parts.slice(0, index + 1).join("."));
  const found = parts.length === 4 ? await db.select().from(regions).where(inArray(regions.code, codes)) : [];
  const [province, city, district, village] = codes.map((code) => found.find((region) => region.code === code));
  if (!province || !city || !district || !village) return { error: "Pilih provinsi sampai kelurahan/desa." };
  if (!value("street")) return { error: "Isi alamat jalan dan nomor rumah." };
  if (!/^\d{5}$/.test(postalCode)) return { error: "Kode pos terdiri dari 5 angka." };
  const [address] = await db
    .insert(addresses)
    .values({
      userId,
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
    })
    .returning();
  return { address };
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

export type PlaceOrderResult = { error: string } | { code: string; whatsapp: string };

/**
 * Mencatat isi keranjang sebagai satu pesanan berstatus "menunggu_konfirmasi" lalu mengembalikan tautan WhatsApp
 * berisi kode pesanan dan ID pembeli. Harga disepakati lewat WhatsApp; alamat dan ongkir diisi pembeli saat
 * checkout. Stok belum dikurangi.
 */
export async function placeOrder(input: { items: { productId: number; quantity: number }[]; notes?: string }): Promise<PlaceOrderResult> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  if (!Array.isArray(input.items) || input.items.length === 0) return { error: "Keranjang masih kosong." };
  if (input.items.length > 20) return { error: "Maksimal 20 produk dalam satu pesanan." };
  const requested = input.items.map((item) => ({ productId: Number(item.productId), quantity: Math.floor(Number(item.quantity)) }));
  if (requested.some((item) => !(item.quantity >= 1 && item.quantity <= 99))) return { error: "Jumlah barang tidak valid." };
  if (new Set(requested.map((item) => item.productId)).size !== requested.length) return { error: "Ada produk ganda di keranjang." };
  const found = await db.query.products.findMany({
    where: and(inArray(products.id, requested.map((item) => item.productId)), eq(products.published, true)),
  });
  const lines: { product: (typeof found)[number]; quantity: number }[] = [];
  for (const item of requested) {
    const product = found.find((product) => product.id === item.productId);
    if (!product) return { error: "Ada produk yang sudah tidak dijual. Hapus dari keranjang lalu coba lagi." };
    if (product.stock !== null && item.quantity > product.stock)
      return { error: product.stock > 0 ? `Stok ${product.name} tersisa ${product.stock}.` : `Stok ${product.name} sedang kosong.` };
    lines.push({ product, quantity: item.quantity });
  }

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
    with: { user: true, items: { with: { product: { columns: { weight: true } } } }, payments: true },
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
  const active = order.payments.find((payment) => isActivePayment(payment));
  if (order.status === "menunggu_pembayaran" && active) return { url: active.url };
  if (order.status !== "menunggu_checkout" && order.status !== "menunggu_pembayaran") return { error: notCheckoutable };
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
      email: order.user.email,
      phone: address.phone.replace(/^0/, "62"),
      address: fullAddress.slice(0, 400),
      postcode: address.postalCode,
    },
  });
  if (!result.ok) return { error: `Link pembayaran belum bisa dibuat. ${result.error}` };
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
    if (updated)
      await tx
        .insert(payments)
        .values({ orderId, invoiceNumber, amount, url: result.url, expiresAt: result.expiresAt, requestId: result.requestId });
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
  // Status ikut dicek di WHERE agar pembayaran yang baru masuk tidak ikut terbatalkan.
  const [cancelled] = await db
    .update(orders)
    .set({ status: "dibatalkan", updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.userId, userId), inArray(orders.status, checkoutStatuses)))
    .returning({ id: orders.id });
  revalidatePath("/pesanan", "layout");
  revalidatePath("/admin", "layout");
  return cancelled ? {} : { error: notCancellable };
}

/** Pembeli mengonfirmasi paket sudah diterima, setelah kurir melaporkan paket sampai. */
export async function confirmReceived(id: number): Promise<CancelOrderState> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const [done] = await db
    .update(orders)
    .set({ status: "selesai", updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.userId, userId), eq(orders.status, "sampai")))
    .returning({ id: orders.id });
  revalidatePath("/pesanan", "layout");
  revalidatePath("/admin", "layout");
  return done ? {} : { error: "Pesanan ini belum sampai atau sudah selesai. Muat ulang halaman untuk melihat statusnya." };
}
