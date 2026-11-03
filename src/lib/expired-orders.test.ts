import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import type { orders as Orders, payments as Payments } from "@/db/schema";

// Database sementara; env harus diisi sebelum @/db dimuat.
const dir = mkdtempSync(join(tmpdir(), "sk-expired-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
after(() => rmSync(dir, { recursive: true, force: true }));

test("batas waktu pembatalan otomatis", async () => {
  const { eq } = await import("drizzle-orm");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  const { orderEvents, orders, payments } = await import("@/db/schema");
  const { cancelExpiredOrders, expiredNote, idleOrderMs, unpaidExpiryMs } = await import("@/lib/payments");
  await migrate(db, { migrationsFolder: "drizzle" });

  const now = new Date("2026-11-03T10:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);
  const second = 1000;
  let seq = 0;
  const order = async (status: (typeof Orders.$inferInsert)["status"], updatedAt: Date, links: Partial<typeof Payments.$inferInsert>[] = []) => {
    const [{ id }] = await db.insert(orders).values({ code: `SK-TEST-${++seq}`, status, updatedAt }).returning({ id: orders.id });
    for (const link of links) await db.insert(payments).values({ orderId: id, amount: 1000, invoiceNumber: `INV${id}P${++seq}`, ...link });
    return id;
  };
  const statusOf = async (id: number) => (await db.query.orders.findFirst({ where: eq(orders.id, id) }))!.status;

  const unpaidOld = await order("menunggu_pembayaran", ago(unpaidExpiryMs), [{ expiresAt: ago(unpaidExpiryMs) }]);
  const unpaidRecentLink = await order("menunggu_pembayaran", ago(unpaidExpiryMs), [
    { expiresAt: ago(unpaidExpiryMs + 1) },
    { expiresAt: ago(unpaidExpiryMs - second) },
  ]);
  const paidLastSecond = await order("menunggu_pembayaran", ago(unpaidExpiryMs * 2), [{ expiresAt: ago(unpaidExpiryMs * 2), paidAt: ago(unpaidExpiryMs * 2) }]);
  const idleOld = await order("menunggu_konfirmasi", ago(idleOrderMs));
  const idleCheckout = await order("menunggu_checkout", ago(idleOrderMs + second));
  const idleRecent = await order("menunggu_checkout", ago(idleOrderMs - second));
  const paid = await order("dibayar", ago(idleOrderMs * 2));
  const flagged = await order("menunggu_pembayaran", ago(unpaidExpiryMs * 2), [{ expiresAt: ago(unpaidExpiryMs * 2) }]);
  await db.update(orders).set({ reviewNote: "Nominal tidak cocok" }).where(eq(orders.id, flagged));

  const cancelled = await cancelExpiredOrders(now);
  assert.deepStrictEqual(cancelled.map(({ id }) => id).sort(), [unpaidOld, idleOld, idleCheckout].sort());
  for (const id of [unpaidOld, idleOld, idleCheckout]) assert.strictEqual(await statusOf(id), "dibatalkan");
  for (const id of [unpaidRecentLink, idleRecent]) assert.notStrictEqual(await statusOf(id), "dibatalkan");
  assert.strictEqual(await statusOf(paidLastSecond), "menunggu_pembayaran");
  assert.strictEqual(await statusOf(paid), "dibayar");
  assert.strictEqual(await statusOf(flagged), "menunggu_pembayaran");

  const events = await db.query.orderEvents.findMany({ where: eq(orderEvents.orderId, idleOld) });
  assert.deepStrictEqual(
    events.map(({ fromStatus, toStatus, source, note }) => ({ fromStatus, toStatus, source, note })),
    [{ fromStatus: "menunggu_konfirmasi", toStatus: "dibatalkan", source: "sistem", note: expiredNote }],
  );

  // Idempoten: jalan ulang tidak membatalkan atau mencatat riwayat lagi.
  assert.deepStrictEqual(await cancelExpiredOrders(now), []);
  assert.strictEqual((await db.query.orderEvents.findMany()).length, 3);
});
