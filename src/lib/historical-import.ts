import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { db } from "@/db";
import { orderEvents, orderItems, orders, payments, products } from "@/db/schema";
import { historicalHeaders, validateHistoricalCsv, type HistoricalRow } from "@/lib/historical-csv";

export async function previewHistoricalImport(database: typeof db, csv: string) {
  const parsed = validateHistoricalCsv(csv);
  const refs = [...new Set(parsed.rows.map((row) => row.externalRef))];
  const [catalog, existing] = await Promise.all([
    database.select({ id: products.id, name: products.name }).from(products).orderBy(products.id),
    database.select({ externalRef: orders.externalRef }).from(orders)
      .where(and(eq(orders.source, "historis"), inArray(orders.externalRef, refs))),
  ]);
  const references = new Set(existing.map((order) => order.externalRef));
  const receiptLines = new Map<string, number[]>();
  for (const row of parsed.records) {
    const ref = row.values[1]?.trim();
    if (!ref) continue;
    const lines = receiptLines.get(ref) ?? [];
    lines.push(row.line);
    receiptLines.set(ref, lines);
  }
  return {
    errors: parsed.errors,
    rows: parsed.records.map((row) => ({
      line: row.line, values: historicalHeaders.map((_, i) => row.values[i]?.trim() ?? ""),
      productId: catalog.find((product) => product.name === row.values[4]?.trim())?.id ?? null,
      duplicate: references.has(row.values[1]?.trim() ?? ""),
      duplicateLines: (receiptLines.get(row.values[1]?.trim() ?? "") ?? []).filter((line) => line !== row.line),
      errors: parsed.errors.filter((error) => error.line === row.line).map((error) => error.message),
    })),
    orderCount: new Set(parsed.rows.map((row) => row.externalRef)).size,
    skipped: new Set(parsed.rows.filter((row) => references.has(row.externalRef)).map((row) => row.externalRef)).size,
  };
}

export async function saveHistoricalImport(database: typeof db, csv: string, recordedBy: number) {
  const parsed = validateHistoricalCsv(csv);
  if (parsed.errors.length) return { errors: parsed.errors, inserted: 0, skipped: 0, batchId: null };
  const grouped = new Map<string, HistoricalRow[]>();
  for (const row of parsed.rows) {
    const items = grouped.get(row.externalRef) ?? [];
    items.push(row);
    grouped.set(row.externalRef, items);
  }
  const batchId = randomUUID();
  return database.transaction(async (tx) => {
    const catalog = await tx.select({ id: products.id, name: products.name }).from(products).orderBy(products.id);
    let inserted = 0, skipped = 0;
    for (const [externalRef, items] of grouped) {
      const first = items[0];
      const subtotal = items.reduce((total, item) => total + item.quantity * item.price, 0);
      const [order] = await tx.insert(orders).values({
        code: `SK-H-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
        source: "historis", status: "selesai", externalRef, importBatchId: batchId,
        customerName: first.customerName, customerPhone: first.customerPhone || null, recordedBy,
        subtotal, shippingCost: first.shippingCost, notes: first.notes, createdAt: first.date,
      }).onConflictDoNothing({ target: [orders.source, orders.externalRef] }).returning({ id: orders.id });
      if (!order) { skipped++; continue; }
      // Stok saat ini sudah mencerminkan penjualan lama; import hanya menulis riwayat.
      for (const item of items) await tx.insert(orderItems).values({
        orderId: order.id, productId: catalog.find((product) => product.name === item.productName)?.id ?? null,
        productName: item.productName, quantity: item.quantity, price: item.price,
      });
      await tx.insert(payments).values({
        orderId: order.id, method: first.method, amount: subtotal + first.shippingCost, paidAt: first.date, createdAt: first.date,
      });
      await tx.insert(orderEvents).values({
        orderId: order.id, toStatus: "selesai", source: "admin", userId: recordedBy, note: `Import historis, batch ${batchId}`,
      });
      inserted++;
    }
    return { errors: [], inserted, skipped, batchId: inserted ? batchId : null };
  });
}

export async function cancelHistoricalImport(database: typeof db, batchId: string) {
  return database.transaction(async (tx) => {
    const deleted = await tx.delete(orders)
      .where(and(eq(orders.source, "historis"), eq(orders.importBatchId, batchId))).returning({ id: orders.id });
    return deleted.length;
  });
}
