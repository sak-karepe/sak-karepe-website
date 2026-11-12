import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

// Database sementara; env harus diisi sebelum @/db dimuat.
const dir = mkdtempSync(join(tmpdir(), "sk-unshipped-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
after(() => rmSync(dir, { recursive: true, force: true }));

test("pesanan dibayar tanpa resi lebih dari batas waktu ditandai", async () => {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  const { orders, payments } = await import("@/db/schema");
  const { unshippedMs, unshippedOrders } = await import("@/lib/shipments");
  await migrate(db, { migrationsFolder: "drizzle" });

  const now = new Date("2026-11-12T10:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  let seq = 0;
  const order = async (status: "dibayar" | "dikirim", paidAt: Date[], waybillId: string | null = null) => {
    const [{ id }] = await db.insert(orders).values({ code: `SK-T-${++seq}`, status, waybillId }).returning({ id: orders.id });
    for (const at of paidAt) await db.insert(payments).values({ orderId: id, method: "tunai", amount: 1000, paidAt: at });
    return id;
  };

  const old = await order("dibayar", [ago(unshippedMs + 1000), ago(1000)]);
  await order("dibayar", [ago(unshippedMs - 60_000)]); // baru dibayar
  await order("dibayar", [ago(unshippedMs * 2)], "RESI123"); // sudah ada resi
  await order("dikirim", [ago(unshippedMs * 2)]);
  await order("dibayar", []); // tanpa pembayaran lunas

  const rows = await unshippedOrders(now);
  assert.deepStrictEqual(rows.map((row) => row.id), [old]);
  assert.ok(rows[0].paidAt instanceof Date);
});
