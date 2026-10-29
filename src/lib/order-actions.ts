"use server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { checkoutStatuses, isOrderStatus } from "@/lib/order-status";
import { cancelActivePayments } from "@/lib/payments";
import { createShipment } from "@/lib/shipping";

export async function updateOrderStatus(id: number, formData: FormData) {
  await requireAdmin();
  const status = formData.get("status");
  if (!isOrderStatus(status)) return;
  // Tanggal sampai dicatat agar pesanan yang ditandai admin juga selesai otomatis 2 hari kemudian; menyimpan ulang
  // status "sampai" tidak menggeser tanggalnya.
  const deliveredAt = sql`case when ${orders.status} = 'sampai' then ${orders.deliveredAt} else unixepoch() end`;
  await db
    .update(orders)
    .set({ status, updatedAt: new Date(), ...(status === "sampai" && { deliveredAt }) })
    .where(eq(orders.id, id));
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
}

export type ShipmentFormState = { error?: string };

/**
 * Memesan kurir pilihan pembeli di Biteship untuk pesanan yang sudah dibayar, menyimpan resinya, dan mengubah status
 * menjadi "dikirim". Perjalanan paket berikutnya diikuti dari webhook Biteship (lib/shipments).
 */
export async function bookShipment(orderId: number, _state: ShipmentFormState, formData: FormData): Promise<ShipmentFormState> {
  await requireAdmin();
  const method = formData.get("method");
  if (method !== "pickup" && method !== "drop_off") return { error: "Pilih cara penyerahan paket ke kurir." };
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: { with: { product: { columns: { weight: true } } } } },
  });
  if (!order || order.status !== "dibayar" || order.shipmentId) return { error: "Resi hanya bisa dibuat sekali untuk pesanan yang sudah dibayar." };
  if (!order.courierCode || !order.courierServiceCode || !order.shippingAddress || !order.postalCode)
    return { error: "Pesanan ini belum punya alamat atau kurir pilihan pembeli." };
  const result = await createShipment({
    reference: `${order.code}-${Date.now().toString(36).toUpperCase()}`,
    method,
    courierCode: order.courierCode,
    serviceCode: order.courierServiceCode,
    destination: { name: order.recipientName ?? "", phone: order.phone ?? "", address: order.shippingAddress, postalCode: order.postalCode },
    items: order.items.map((item) => ({
      name: item.productName,
      price: item.price ?? 0,
      quantity: item.quantity,
      weight: item.product?.weight ?? null,
    })),
  });
  // Bila balasan terputus, order bisa saja sudah terbuat di Biteship tanpa tercatat di sini.
  if (!result.ok)
    return { error: `Kurir belum bisa dipesan. ${result.error} Bila order ini sudah muncul di dashboard Biteship, batalkan dulu di sana.` };
  const [saved] = await db
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
  if (!saved) {
    console.warn(`[biteship] Order ${result.id} ganda untuk pesanan ${order.code}; batalkan di dashboard Biteship`);
    return { error: `Pesanan berubah atau resi sudah dibuat dari tab lain. Batalkan order ${result.id} di dashboard Biteship karena ganda.` };
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return {};
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
