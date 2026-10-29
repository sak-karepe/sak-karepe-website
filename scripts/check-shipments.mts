// Cek alur status pengiriman dan pembayaran di database sementara: npm run check
import assert from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), "sakkarepe-")), "check.db")}`;
const { eq } = await import("drizzle-orm");
const { migrate } = await import("drizzle-orm/libsql/migrator");
const { db } = await import("@/db");
const { orders, payments, shipmentHistory, users } = await import("@/db/schema");
const { applyPayment } = await import("@/lib/payments");
const { applyShipment, completeDeliveredOrders, autoCompleteMs, onHoldMs, saveResend, stuckOnHoldOrders } = await import("@/lib/shipments");

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

// Kirim ulang: resi baru di pesanan, resi lama tersimpan di riwayat; kirim ulang kedua dari tab lain ditolak.
const address = { recipientName: "Budi", phone: "081234567890", shippingAddress: "Jl. Baru 1", postalCode: "60111" };
assert.ok(await saveResend(back, address, "pickup", "pembeli", shipment("bs3b", "confirmed")));
assert.equal(await saveResend(back, address, "pickup", "pembeli", shipment("bs3c", "confirmed")), undefined);
const resent = await read(returned);
assert.deepEqual([resent.status, resent.shipmentId, resent.shippingAddress, resent.shipmentNote], ["dikirim", "bs3b", "Jl. Baru 1", null]);
const history = await db.query.shipmentHistory.findMany({ where: eq(shipmentHistory.orderId, returned) });
assert.deepEqual(
  history.map((row) => [row.shipmentId, row.waybillId, row.shipmentStatus, row.note, row.resendPaidBy]),
  [["bs3", "RESI3", "returned", "Alamat tidak ditemukan", "pembeli"]],
);

// on_hold lebih dari 3 hari ditandai.
const held = await insert("SK-4", "bs4");
await applyShipment(shipment("bs4", "on_hold"));
assert.equal((await stuckOnHoldOrders()).length, 0);
assert.deepEqual((await stuckOnHoldOrders(new Date(Date.now() + onHoldMs + 1000))).map((order) => order.id), [held]);

// Pembayaran: nominal tidak cocok dan invoice tak dikenal ditandai, bukan dicatat lunas; notifikasi berulang aman.
const unpaid = (await db.insert(orders).values({ code: "SK-261029-AB1P", userId: user.id, status: "menunggu_pembayaran" }).returning())[0].id;
await db.insert(payments).values({ orderId: unpaid, invoiceNumber: "SK261029AB1PP1", amount: 150000, url: "https://doku", expiresAt: new Date() });
const paid = (amount: number | string, invoice = "SK261029AB1PP1") =>
  applyPayment({ order: { invoice_number: invoice, amount }, transaction: { status: "SUCCESS" }, channel: { id: "QRIS" } });
await applyPayment({ order: { invoice_number: "SK261029AB1PP1", amount: 150000 }, transaction: { status: "FAILED" } });
await paid(1000);
assert.deepEqual([(await read(unpaid)).status, (await read(unpaid)).reviewNote?.includes("tidak cocok")], ["menunggu_pembayaran", true]);
await db.update(orders).set({ reviewNote: null }).where(eq(orders.id, unpaid));
await paid("150000.00");
await paid(150000);
assert.deepEqual([(await read(unpaid)).status, (await read(unpaid)).reviewNote], ["dibayar", null]);
await paid(150000, "SK261029AB1PP9");
assert.ok((await read(unpaid)).reviewNote?.includes("tidak dikenal"));
// Uang masuk untuk pesanan yang sudah dibatalkan: status tetap, pesanan ditandai untuk refund manual.
const cancelled = (await db.insert(orders).values({ code: "SK-261029-CD2", userId: user.id, status: "dibatalkan" }).returning())[0].id;
await db.insert(payments).values({ orderId: cancelled, invoiceNumber: "SK261029CD2P1", amount: 50000, url: "https://doku", expiresAt: new Date() });
await paid(50000, "SK261029CD2P1");
assert.deepEqual([(await read(cancelled)).status, (await read(cancelled)).reviewNote?.includes("tidak sedang menunggu")], ["dibatalkan", true]);
console.log("ok");
