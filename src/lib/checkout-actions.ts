"use server";
import { randomInt } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/db";
import { addresses, orderItems, orders, payments, products, regions, type Address } from "@/db/schema";
import { formatAddress } from "@/lib/address";
import { cancelCheckout } from "@/lib/doku";
import { whatsappUrl } from "@/lib/contact";
import { formatRupiah } from "@/lib/format";

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
 * Mencatat pesanan berstatus "menunggu_konfirmasi" lalu mengembalikan tautan WhatsApp berisi kode pesanan
 * dan ID pembeli. Harga akhir, ongkir, dan pembayaran disepakati penjual lewat WhatsApp; stok belum dikurangi.
 */
export async function placeOrder(input: {
  productId: number;
  quantity: number;
  addressId: number;
  notes?: string;
}): Promise<PlaceOrderResult> {
  const userId = await currentUserId();
  if (!userId) return { error: loginRequired };
  const quantity = Math.floor(Number(input.quantity));
  if (!(quantity >= 1 && quantity <= 99)) return { error: "Jumlah barang tidak valid." };
  const [product, address] = await Promise.all([
    db.query.products.findFirst({ where: and(eq(products.id, input.productId), eq(products.published, true)) }),
    db.query.addresses.findFirst({ where: and(eq(addresses.id, input.addressId), eq(addresses.userId, userId)) }),
  ]);
  if (!product) return { error: "Produk tidak ditemukan atau sudah tidak dijual." };
  if (!address) return { error: "Pilih alamat pengiriman." };
  if (product.stock !== null && quantity > product.stock)
    return { error: product.stock > 0 ? `Stok tersisa ${product.stock}.` : "Stok produk sedang kosong." };

  const notes = String(input.notes ?? "").trim().slice(0, 500);
  const shippingAddress = formatAddress(address);
  const subtotal = product.price === null ? null : product.price * quantity;
  const code = await newOrderCode();
  const orderId = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        code,
        userId,
        recipientName: address.recipientName,
        phone: address.phone,
        shippingAddress: address.notes ? `${shippingAddress} (${address.notes})` : shippingAddress,
        postalCode: address.postalCode,
        subtotal,
        notes,
      })
      .returning({ id: orders.id });
    await tx.insert(orderItems).values({ orderId: order.id, productId: product.id, productName: product.name, price: product.price, quantity });
    return order.id;
  });

  const message = [
    "Halo Sak Karepe, saya ingin memesan:",
    "",
    `• ${product.name} × ${quantity}${subtotal === null ? " (harga melalui konsultasi)" : ` — ${formatRupiah(subtotal)}`}`,
    "",
    `ID pesanan: ${orderId}`,
    `Kode pesanan: ${code}`,
    `ID pembeli: ${userId}`,
    "",
    "Dikirim ke:",
    `${address.recipientName} (${address.phone})`,
    `${shippingAddress} ${address.postalCode}`,
    ...(address.notes ? [`Patokan: ${address.notes}`] : []),
    ...(notes ? ["", `Catatan: ${notes}`] : []),
    "",
    "Mohon info total harga dan ongkos kirimnya. Terima kasih.",
    "",
    "⚠️ Mohon jangan menghapus atau mengubah pesan ini. ID dan kode pesanan dipakai penjual untuk memproses pesananmu.",
  ].join("\n");
  return { code, whatsapp: whatsappUrl(message) };
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
  if (!order || (order.status !== "menunggu_konfirmasi" && order.status !== "menunggu_pembayaran") || order.payments.some((p) => p.paidAt))
    return { error: notCancellable };
  const now = new Date();
  const active = order.payments.filter((payment) => !payment.cancelledAt && payment.expiresAt > now);
  for (const payment of active) {
    // Link yang dibuat sebelum Request-Id disimpan tidak bisa dibatalkan lewat API.
    if (!payment.requestId) return { error: "Link pembayaran pesanan ini tidak bisa dibatalkan otomatis. Hubungi Sak Karepe lewat WhatsApp." };
    const result = await cancelCheckout(payment.invoiceNumber, payment.requestId, `Dibatalkan pembeli (${order.code})`);
    if (!result.ok) return { error: `Pesanan tidak dibatalkan. ${result.error}` };
    await db.update(payments).set({ cancelledAt: new Date() }).where(eq(payments.id, payment.id));
  }
  // Status ikut dicek di WHERE agar pembayaran yang baru masuk tidak ikut terbatalkan.
  const [cancelled] = await db
    .update(orders)
    .set({ status: "dibatalkan", updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.userId, userId), inArray(orders.status, ["menunggu_konfirmasi", "menunggu_pembayaran"])))
    .returning({ id: orders.id });
  revalidatePath("/pesanan", "layout");
  revalidatePath("/admin", "layout");
  return cancelled ? {} : { error: notCancellable };
}
