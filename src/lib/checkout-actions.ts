"use server";
import { randomInt } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { currentUserId } from "@/auth";
import { db } from "@/db";
import { addresses, orderItems, orders, products, type Address } from "@/db/schema";
import { whatsappUrl } from "@/lib/contact";
import { formatRupiah } from "@/lib/format";

const loginRequired = "Sesi masuk berakhir. Silakan masuk kembali.";

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
  const required = ["recipientName", "street", "district", "city", "province"].every((name) => value(name));
  if (!required) return { error: "Lengkapi nama penerima dan alamat." };
  if (!phone) return { error: "Nomor HP tidak valid. Contoh: 081234567890." };
  if (!/^\d{5}$/.test(postalCode)) return { error: "Kode pos terdiri dari 5 angka." };
  const [address] = await db
    .insert(addresses)
    .values({
      userId,
      recipientName: value("recipientName"),
      phone,
      street: value("street"),
      district: value("district"),
      city: value("city"),
      province: value("province"),
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
  const shippingAddress = [address.street, address.district, address.city, address.province].join(", ");
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
