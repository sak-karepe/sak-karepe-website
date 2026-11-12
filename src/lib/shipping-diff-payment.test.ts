import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";

// `@/db` membaca DATABASE_URL saat di-import, jadi diset sebelum import dinamis di bawah.
process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), "sk-diff-")), "test.db")}`;

const change = {
  recipientName: "Budi Hartono",
  phone: "081987654321",
  shippingAddress: "Jl. Melati No. 2, Sidoarjo",
  postalCode: "61256",
  courierCode: "jne",
  courierServiceCode: "reg",
  courierName: "JNE Reguler",
  shippingCost: 30000,
};

test("alamat baru dari selisih ongkir baru diterapkan setelah lunas, dan ditolak bila kurir sudah dipesan", async () => {
  const { db } = await import("@/db");
  const schema = await import("@/db/schema");
  const { applyPayment } = await import("@/lib/payments");
  await migrate(db, { migrationsFolder: "drizzle" });

  const [buyer] = await db.insert(schema.users).values({ email: "buyer@example.com" }).returning();
  const base = {
    userId: buyer.id,
    status: "dibayar" as const,
    recipientName: "Budi Santoso",
    phone: "081234567890",
    shippingAddress: "Jl. Mawar No. 1, Surabaya",
    postalCode: "60111",
    shippingCost: 20000,
  };
  const [open] = await db.insert(schema.orders).values({ ...base, code: "SK-T-1" }).returning();
  const [booked] = await db.insert(schema.orders).values({ ...base, code: "SK-T-2", shipmentId: "bs-1" }).returning();
  await db.insert(schema.payments).values([
    { orderId: open.id, invoiceNumber: "SKT1S2", amount: 10000, pendingChange: change },
    { orderId: booked.id, invoiceNumber: "SKT2S2", amount: 10000, pendingChange: change },
  ]);

  // Sebelum lunas, alamat pesanan belum berubah.
  assert.equal((await db.query.orders.findFirst({ where: eq(schema.orders.id, open.id) }))!.postalCode, "60111");

  const paid = (invoice: string) =>
    applyPayment({ order: { invoice_number: invoice, amount: 10000 }, transaction: { status: "SUCCESS" } } as never);
  await paid("SKT1S2");
  await paid("SKT2S2");

  const after = await db.query.orders.findFirst({ where: eq(schema.orders.id, open.id) });
  assert.equal(after!.postalCode, "61256");
  assert.equal(after!.shippingCost, 30000);
  assert.equal(after!.courierName, "JNE Reguler");

  const rejected = await db.query.orders.findFirst({ where: eq(schema.orders.id, booked.id) });
  assert.equal(rejected!.postalCode, "60111");
  assert.match(rejected!.reviewNote ?? "", /kurir sudah dipesan/);
});
