import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, products } from "@/db/schema";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Item katalog sebuah pesanan; item bebas (tanpa productId) tidak punya stok. */
const catalogItems = (tx: Tx, orderId: number) =>
  tx
    .select({ productId: sql<number>`${orderItems.productId}`, productName: orderItems.productName, quantity: orderItems.quantity })
    .from(orderItems)
    .where(and(eq(orderItems.orderId, orderId), isNotNull(orderItems.productId)));

/**
 * Mengurangi stok produk sebuah pesanan; dipanggil sekali saat pesanan dibayar (DOKU) atau dicatat (penjualan langsung),
 * di transaksi yang sama dengan perubahan statusnya. Produk dengan stok kosong (null) tidak dilacak. Stok tidak pernah
 * negatif: bila tidak cukup (dua pembeli membayar barang terakhir), stok menjadi 0 dan nama produknya dikembalikan.
 */
export async function takeStock(tx: Tx, orderId: number) {
  const short: string[] = [];
  for (const item of await catalogItems(tx, orderId)) {
    const [taken] = await tx
      .update(products)
      .set({ stock: sql`${products.stock} - ${item.quantity}` })
      .where(and(eq(products.id, item.productId), gte(products.stock, item.quantity)))
      .returning({ id: products.id });
    if (taken) continue;
    const [emptied] = await tx
      .update(products)
      .set({ stock: 0 })
      .where(and(eq(products.id, item.productId), isNotNull(products.stock)))
      .returning({ id: products.id });
    if (emptied) short.push(item.productName);
  }
  return short;
}

/**
 * Mengembalikan stok pesanan yang sudah dibayar lalu dibatalkan. Panggil di transaksi yang sama dengan perubahan status
 * ke "dibatalkan" (status lama dicek di WHERE) agar hanya terjadi sekali.
 * shortcut: jumlah penuh dikembalikan walau takeStock dulu kekurangan stok; catat jumlah yang benar-benar diambil bila oversell sering terjadi.
 */
export async function returnStock(tx: Tx, orderId: number) {
  for (const item of await catalogItems(tx, orderId))
    await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${item.quantity}` })
      .where(and(eq(products.id, item.productId), isNotNull(products.stock)));
}
