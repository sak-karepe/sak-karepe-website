import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, mock, test } from "node:test";

// Database sementara; env harus diisi sebelum @/db dimuat.
const dir = mkdtempSync(join(tmpdir(), "sk-refund-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
after(() => rmSync(dir, { recursive: true, force: true }));

let adminId = "0";
mock.module("@/auth", { namedExports: { requireAdmin: async () => ({ id: adminId }) } });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

test("refund mengembalikan stok tepat sekali, menolak pesanan yang kurirnya sudah dipesan, dan tidak mengembalikan stok retur", async () => {
  const { eq } = await import("drizzle-orm");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  const { categories, orderItems, orders, payments, products, users } = await import("@/db/schema");
  const { refundOrder } = await import("@/lib/order-actions");
  await migrate(db, { migrationsFolder: "drizzle" });

  const [admin] = await db.insert(users).values({ email: "admin@x.id", role: "admin" }).returning();
  adminId = String(admin.id);
  await db
    .insert(categories)
    .values({ slug: "tas", title: "Tas", subtitle: "", description: "", intro: "", character: "", coverImage: "" })
    .onConflictDoNothing();
  const [product] = await db.insert(products).values({ slug: "tas-a", name: "Tas A", categorySlug: "tas", stock: 5 }).returning();
  const stock = async () => (await db.query.products.findFirst({ where: eq(products.id, product.id) }))!.stock;
  const newOrder = async (code: string, values: Partial<typeof orders.$inferInsert>) => {
    const [order] = await db.insert(orders).values({ code, subtotal: 100_000, ...values }).returning();
    await db.insert(orderItems).values({ orderId: order.id, productId: product.id, productName: "Tas A", price: 50_000, quantity: 2 });
    await db.insert(payments).values({ orderId: order.id, method: "transfer", amount: 100_000, paidAt: new Date() });
    return order;
  };
  const status = async (id: number) => (await db.query.orders.findFirst({ where: eq(orders.id, id) }))!.status;

  const paid = await newOrder("SK-R1", { status: "dibayar" });
  assert.deepStrictEqual(await refundOrder(paid.id), {});
  assert.strictEqual(await status(paid.id), "refund");
  assert.strictEqual(await stock(), 7);
  assert.ok((await refundOrder(paid.id)).error, "klik ganda ditolak");
  assert.strictEqual(await stock(), 7, "stok tidak kembali dua kali");

  const booked = await newOrder("SK-R2", { status: "dibayar", shipmentId: "bs-1" });
  assert.ok((await refundOrder(booked.id)).error);
  assert.strictEqual(await status(booked.id), "dibayar");

  const returned = await newOrder("SK-R3", { status: "retur" });
  assert.deepStrictEqual(await refundOrder(returned.id), {});
  assert.strictEqual(await status(returned.id), "refund");
  assert.strictEqual(await stock(), 7, "stok retur tidak dikembalikan otomatis");
});
