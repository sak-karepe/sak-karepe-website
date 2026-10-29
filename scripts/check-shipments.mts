// Cek alur status pengiriman di database sementara: npm run check
import assert from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), "sakkarepe-")), "check.db")}`;
const { eq } = await import("drizzle-orm");
const { migrate } = await import("drizzle-orm/libsql/migrator");
const { db } = await import("@/db");
const { orders, users } = await import("@/db/schema");
const { applyShipment, completeDeliveredOrders, autoCompleteMs, onHoldMs, stuckOnHoldOrders } = await import("@/lib/shipments");

await migrate(db, { migrationsFolder: "drizzle" });
const [user] = await db.insert(users).values({ email: "cek@example.com" }).returning();
const insert = async (code: string, shipmentId: string) =>
  (await db.insert(orders).values({ code, userId: user.id, status: "dikirim", shipmentId }).returning())[0].id;
const read = async (id: number) => (await db.query.orders.findFirst({ where: eq(orders.id, id) }))!;
const shipment = (id: string, status: string, waybillId: string | null = null, note: string | null = null) => ({
  id,
  status,
  waybillId,
  trackingUrl: null,
  note,
});

const id = await insert("SK-1", "bs1");
await applyShipment(shipment("bs1", "allocated"));
assert.deepEqual([(await read(id)).status, (await read(id)).shipmentStatus], ["dikirim", "allocated"]);
await applyShipment(shipment("bs1", "picked", "RESI1"));
assert.deepEqual([(await read(id)).status, (await read(id)).shipmentStatus, (await read(id)).waybillId], ["dikirim", "picked", "RESI1"]);
await applyShipment(shipment("bs1", "delivered"));
assert.equal((await read(id)).status, "sampai");
assert.equal((await read(id)).waybillId, "RESI1");
// Notifikasi telat tidak memundurkan status, dan pembatalan setelah sampai tidak melepas resi.
await applyShipment(shipment("bs1", "picked"));
await applyShipment(shipment("bs1", "cancelled"));
assert.deepEqual([(await read(id)).status, (await read(id)).shipmentStatus, (await read(id)).shipmentId], ["sampai", "delivered", "bs1"]);
assert.equal((await completeDeliveredOrders()).length, 0);
assert.equal((await completeDeliveredOrders(new Date(Date.now() + autoCompleteMs + 1000))).length, 1);
assert.equal((await read(id)).status, "selesai");

// Kurir tidak ditemukan sebelum dijemput: kembali "dibayar" dan resi dilepas agar admin bisa memesan ulang.
const failed = await insert("SK-2", "bs2");
await applyShipment(shipment("bs2", "courier_not_found", "RESI2"));
const reset = await read(failed);
assert.deepEqual([reset.status, reset.shipmentId, reset.waybillId], ["dibayar", null, null]);

// Paket dikembalikan kurir: "gagal_kirim" dengan alasan, tidak pernah sampai/selesai otomatis.
const returned = await insert("SK-3", "bs3");
await applyShipment(shipment("bs3", "return_in_transit", "RESI3", "Alamat tidak ditemukan"));
await applyShipment(shipment("bs3", "returned"));
await applyShipment(shipment("bs3", "delivered"));
const back = await read(returned);
assert.deepEqual([back.status, back.shipmentStatus, back.shipmentNote, back.waybillId], ["gagal_kirim", "returned", "Alamat tidak ditemukan", "RESI3"]);
assert.equal((await completeDeliveredOrders(new Date(Date.now() + 10 * autoCompleteMs))).length, 0);
assert.equal((await read(returned)).status, "gagal_kirim");

// on_hold lebih dari 3 hari ditandai.
const held = await insert("SK-4", "bs4");
await applyShipment(shipment("bs4", "on_hold"));
assert.equal((await stuckOnHoldOrders()).length, 0);
assert.deepEqual((await stuckOnHoldOrders(new Date(Date.now() + onHoldMs + 1000))).map((order) => order.id), [held]);

console.log("ok");
