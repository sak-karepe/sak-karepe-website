import assert from "node:assert";
import { createHash, createHmac } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, mock, test } from "node:test";

// Database sementara dan rahasia webhook; env harus diisi sebelum @/db dan route dimuat.
const dir = mkdtempSync(join(tmpdir(), "sk-webhooks-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
process.env.DOKU_CLIENT_ID = "BRN-test";
process.env.DOKU_SECRET_KEY = "rahasia";
process.env.BITESHIP_WEBHOOK_SECRET = "rahasia-biteship";
process.env.BITESHIP_API_KEY = "biteship_test.key";
after(() => rmSync(dir, { recursive: true, force: true }));

// revalidatePath butuh runtime Next.
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

const load = async () => ({
  ...(await import("drizzle-orm")),
  ...(await import("@/db")),
  ...(await import("@/db/schema")),
  doku: await import("@/app/api/doku/notification/route"),
  biteship: await import("@/app/api/biteship/webhook/route"),
  ...(await import("@/lib/shipments")),
});

before(async () => {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  await migrate(db, { migrationsFolder: "drizzle" });
});

let seq = 0;
async function newOrder(values: Record<string, unknown>) {
  const { db, orders } = await load();
  const [{ id }] = await db.insert(orders).values({ code: `SK-TEST-${++seq}`, ...values }).returning({ id: orders.id });
  return id;
}

const dokuRequest = (body: string, signature?: string) => {
  const digest = createHash("sha256").update(body).digest("base64");
  const component = `Client-Id:BRN-test\nRequest-Id:req-1\nRequest-Timestamp:2026-11-08T10:00:00Z\nRequest-Target:/api/doku/notification\nDigest:${digest}`;
  return new Request("http://localhost/api/doku/notification", {
    method: "POST",
    body,
    headers: {
      "Client-Id": "BRN-test",
      "Request-Id": "req-1",
      "Request-Timestamp": "2026-11-08T10:00:00Z",
      Signature: signature ?? `HMACSHA256=${createHmac("sha256", "rahasia").update(component).digest("base64")}`,
    },
  });
};

test("notifikasi DOKU bersignature salah ditolak 401 tanpa mengubah pesanan", async () => {
  const { db, eq, orders, payments, doku } = await load();
  const id = await newOrder({ status: "menunggu_pembayaran" });
  await db.insert(payments).values({ orderId: id, amount: 1000, invoiceNumber: `INV${id}P1` });
  const body = JSON.stringify({ order: { invoice_number: `INV${id}P1`, amount: 1000 }, transaction: { status: "SUCCESS" } });

  assert.strictEqual((await doku.POST(dokuRequest(body, "HMACSHA256=palsu"))).status, 401);
  // Isi diubah setelah ditandatangani.
  const tampered = dokuRequest(body);
  const forged = new Request(tampered, { body: body.replace("1000", "1") });
  assert.strictEqual((await doku.POST(forged)).status, 401);
  assert.strictEqual((await db.query.orders.findFirst({ where: eq(orders.id, id) }))!.status, "menunggu_pembayaran");
});

test("notifikasi DOKU dobel hanya mengubah status dan stok sekali", async () => {
  const { db, eq, categories, orderEvents, orderItems, orders, payments, products, doku } = await load();
  await db.insert(categories).values({ slug: "busana", title: "Busana", subtitle: "", description: "", intro: "", character: "", coverImage: "" });
  const [product] = await db.insert(products).values({ categorySlug: "busana", name: "Batik", slug: "batik", stock: 5 }).returning();
  const id = await newOrder({ status: "menunggu_pembayaran" });
  await db.insert(orderItems).values({ orderId: id, productId: product.id, productName: "Batik", quantity: 2 });
  await db.insert(payments).values({ orderId: id, amount: 150000, invoiceNumber: `INV${id}P1` });
  const body = JSON.stringify({ order: { invoice_number: `INV${id}P1`, amount: 150000 }, transaction: { status: "SUCCESS" } });

  for (let i = 0; i < 2; i++) assert.strictEqual((await doku.POST(dokuRequest(body))).status, 200);

  const order = (await db.query.orders.findFirst({ where: eq(orders.id, id) }))!;
  assert.strictEqual(order.status, "dibayar");
  assert.strictEqual(order.reviewNote, null);
  assert.strictEqual((await db.query.products.findFirst({ where: eq(products.id, product.id) }))!.stock, 3);
  const events = await db.query.orderEvents.findMany({ where: eq(orderEvents.orderId, id) });
  assert.deepStrictEqual(events.map(({ fromStatus, toStatus }) => [fromStatus, toStatus]), [["menunggu_pembayaran", "dibayar"]]);
});

const biteshipRequest = (body: unknown, signature?: string) =>
  new Request("http://localhost/api/biteship/webhook", {
    method: "POST",
    body: JSON.stringify(body),
    headers: signature === undefined ? {} : { "X-Sakkarepe-Signature": signature },
  });

test("webhook Biteship tanpa atau dengan signature salah ditolak 401", async () => {
  const { biteship } = await load();
  let called = false;
  globalThis.fetch = async () => ((called = true), new Response("{}"));
  assert.strictEqual((await biteship.POST(biteshipRequest({ order_id: "x" }))).status, 401);
  assert.strictEqual((await biteship.POST(biteshipRequest({ order_id: "x" }, "salah"))).status, 401);
  assert.ok(!called, "Orders API tidak boleh dipanggil untuk webhook palsu");
});

test("webhook Biteship dobel hanya mengubah status sekali", async () => {
  const { db, eq, orderEvents, orders, biteship } = await load();
  const id = await newOrder({ status: "dikirim", shipmentId: "bs-1", shipmentStatus: "picked" });
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ success: true, id: "bs-1", status: "delivered", courier: { waybill_id: "WB1", link: "https://lacak" } }));

  for (let i = 0; i < 2; i++) assert.strictEqual((await biteship.POST(biteshipRequest({ order_id: "bs-1" }, "rahasia-biteship"))).status, 200);

  const order = (await db.query.orders.findFirst({ where: eq(orders.id, id) }))!;
  assert.strictEqual(order.status, "sampai");
  assert.strictEqual(order.waybillId, "WB1");
  assert.ok(order.deliveredAt);
  const events = await db.query.orderEvents.findMany({ where: eq(orderEvents.orderId, id) });
  assert.deepStrictEqual(events.map(({ fromStatus, toStatus }) => [fromStatus, toStatus]), [["dikirim", "sampai"]]);
});

test("pesanan sampai otomatis selesai setelah autoCompleteMs", async () => {
  const { db, eq, inArray, orderEvents, orders, autoCompleteMs, completeDeliveredOrders } = await load();
  const now = new Date("2026-11-08T10:00:00Z");
  const old = await newOrder({ status: "sampai", deliveredAt: new Date(now.getTime() - autoCompleteMs) });
  const recent = await newOrder({ status: "sampai", deliveredAt: new Date(now.getTime() - autoCompleteMs + 1000) });
  // Pesanan dari test lain (deliveredAt = sekarang, setelah `now`) tidak boleh ikut.
  const done = await completeDeliveredOrders(now);
  assert.deepStrictEqual(done.map(({ id }) => id), [old]);
  const statuses = await db.query.orders.findMany({ columns: { id: true, status: true }, where: inArray(orders.id, [old, recent]) });
  assert.deepStrictEqual(Object.fromEntries(statuses.map(({ id, status }) => [id, status])), { [old]: "selesai", [recent]: "sampai" });
  assert.deepStrictEqual(await completeDeliveredOrders(now), []);
  assert.strictEqual((await db.query.orderEvents.findMany({ where: eq(orderEvents.orderId, old) })).length, 1);
});
