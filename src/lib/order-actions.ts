"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { orderItems, orders, payments } from "@/db/schema";
import { createCheckout } from "@/lib/doku";
import { isOrderStatus } from "@/lib/order-status";

export async function updateOrderStatus(id: number, formData: FormData) {
  await requireAdmin();
  const status = formData.get("status");
  if (!isOrderStatus(status)) return;
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
  revalidatePath("/admin", "layout");
}

export type PaymentFormState = { error?: string; url?: string; expiresAt?: string };

/** "150.000" atau "Rp150000" menjadi 150000; kosong menjadi null. */
function parseAmount(value: FormDataEntryValue | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** Link berlaku 24 jam agar pembeli sempat membayar setelah dikirimi lewat WhatsApp. */
const dueMinutes = 24 * 60;

/** Menyimpan harga kesepakatan dan ongkir, lalu membuat link DOKU Checkout untuk pesanan. */
export async function createPayment(orderId: number, _state: PaymentFormState, formData: FormData): Promise<PaymentFormState> {
  await requireAdmin();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { user: true, items: true, payments: { columns: { id: true } } },
  });
  if (!order) return { error: "Pesanan tidak ditemukan." };
  if (order.status !== "menunggu_konfirmasi" && order.status !== "menunggu_pembayaran")
    return { error: "Pembayaran hanya bisa dibuat untuk pesanan yang menunggu konfirmasi atau pembayaran." };
  const prices = order.items.map((item) => parseAmount(formData.get(`price-${item.id}`)));
  if (prices.some((price) => !price)) return { error: "Isi harga setiap produk." };
  const shippingCost = parseAmount(formData.get("shippingCost")) ?? 0;
  const items = order.items.map((item, index) => ({ ...item, price: prices[index]! }));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const amount = subtotal + shippingCost;
  if (amount > 999_999_999_999) return { error: "Total terlalu besar." };
  const lineItems = items.map((item) => ({
    id: String(item.productId ?? `item${item.id}`),
    name: item.productName.slice(0, 255),
    price: item.price,
    quantity: item.quantity,
  }));
  if (shippingCost) lineItems.push({ id: "ongkir", name: "Ongkos kirim", price: shippingCost, quantity: 1 });
  // Tanpa simbol agar diterima semua kanal pembayaran (KKI), mis. SK261023Y7D3P1.
  const invoiceNumber = `${order.code.replace(/[^A-Z0-9]/g, "")}P${order.payments.length + 1}`;
  const result = await createCheckout({
    invoiceNumber,
    amount,
    lineItems,
    dueMinutes,
    customer: {
      id: String(order.userId),
      name: order.recipientName.replace(/[^\p{L} ]/gu, "").trim().slice(0, 255),
      email: order.user.email,
      phone: order.phone.replace(/^0/, "62"),
      address: order.shippingAddress.slice(0, 400),
      postcode: order.postalCode,
    },
  });
  if (!result.ok) return { error: result.error };
  await db.transaction(async (tx) => {
    for (const item of items) await tx.update(orderItems).set({ price: item.price }).where(eq(orderItems.id, item.id));
    await tx
      .update(orders)
      .set({ subtotal, shippingCost, status: "menunggu_pembayaran", updatedAt: new Date() })
      .where(eq(orders.id, orderId));
    await tx.insert(payments).values({ orderId, invoiceNumber, amount, url: result.url, expiresAt: result.expiresAt });
  });
  revalidatePath("/admin", "layout");
  return { url: result.url, expiresAt: result.expiresAt.toISOString() };
}
