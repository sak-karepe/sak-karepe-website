import assert from "node:assert";
import { test } from "node:test";
import { orderStatuses, type Order } from "@/db/schema";
import { adminTransitions, checkoutStatuses, initialStatuses, orderTransitions } from "@/lib/order-status";

const allowed = (from: Order["status"], to: Order["status"]) => orderTransitions[from].includes(to);

test("pesanan dibayar hanya batal lewat refund", () => {
  assert.ok(!allowed("dibayar", "dibatalkan"));
  assert.ok(allowed("dibayar", "refund") && allowed("refund", "dibatalkan"));
  for (const from of orderStatuses) assert.ok(!adminTransitions[from]?.includes("refund"));
});

test("dikirim hanya dari booking kurir, tidak dari dropdown admin", () => {
  for (const from of orderStatuses) assert.ok(!adminTransitions[from]?.includes("dikirim"), from);
  assert.deepEqual(orderStatuses.filter((from) => allowed(from, "dikirim")), ["dibayar", "gagal_kirim", "retur"]);
});

test("selesai dan dibatalkan final", () => {
  assert.deepEqual(orderTransitions.selesai, []);
  assert.deepEqual(orderTransitions.dibatalkan, []);
});

test("dropdown admin bagian dari tabel transisi", () => {
  for (const [from, targets] of Object.entries(adminTransitions))
    for (const to of targets) assert.ok(allowed(from as Order["status"], to), `${from} -> ${to}`);
});

test("alur yang sudah ada tercakup tabel", () => {
  const flows: [Order["status"], Order["status"]][] = [
    ...checkoutStatuses.flatMap((from): [Order["status"], Order["status"]][] => [[from, "dibatalkan"], [from, "dibayar"]]), // cancelOrder, notifikasi DOKU
    ...checkoutStatuses.map((from): [Order["status"], Order["status"]] => [from, "menunggu_checkout"]), // createCheckoutLink
    ["menunggu_checkout", "menunggu_pembayaran"], // checkout pembeli
    ["dibayar", "dikirim"], // bookShipment
    ["dikirim", "dibayar"], // booking gagal di Biteship
    ["dikirim", "sampai"], // webhook delivered
    ["sampai", "selesai"], // confirmReceived, completeDeliveredOrders
  ];
  for (const [from, to] of flows) assert.ok(allowed(from, to), `${from} -> ${to}`);
});

test("status awal per sumber", () => {
  assert.deepEqual(initialStatuses, {
    online: ["menunggu_konfirmasi"],
    langsung: ["dibayar", "selesai"],
    historis: ["selesai"],
  });
});

test("setiap status punya baris transisi", () => {
  for (const from of orderStatuses) for (const to of orderTransitions[from]) assert.ok(orderStatuses.includes(to));
});
