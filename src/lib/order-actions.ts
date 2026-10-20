"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { checkoutStatuses, isOrderStatus } from "@/lib/order-status";
import { cancelActivePayments } from "@/lib/payments";

export async function updateOrderStatus(id: number, formData: FormData) {
  await requireAdmin();
  const status = formData.get("status");
  if (!isOrderStatus(status)) return;
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
  revalidatePath("/admin", "layout");
}

export type CheckoutLinkFormState = { error?: string; saved?: boolean };

/** "150.000" atau "Rp150000" menjadi 150000; kosong menjadi null. */
function parseAmount(value: FormDataEntryValue | null) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

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
  await requireAdmin();
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
  });
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return { saved: true };
}
