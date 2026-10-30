import assert from "node:assert";
import { test } from "node:test";
import { getShipment, lowBalance, quoteShipping, quotaReached, unreachable } from "@/lib/shipping";

process.env.BITESHIP_API_KEY = "biteship_test.key";

// Webhook Biteship hanya diulang bila galatnya `unreachable`, jadi pemetaan status HTTP ini menentukan retry.
const reply = (status: number, body: unknown) => {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
};

test("HTTP 5xx, galat jaringan, dan balasan terputus dianggap gangguan", async () => {
  reply(503, { success: false, error: "Service Unavailable" });
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: unreachable });
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: unreachable });
  globalThis.fetch = async () => new Response("{\"success\":tr", { status: 200 });
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: unreachable });
});

test("penolakan HTTP 4xx memakai pesan Biteship", async () => {
  reply(400, { success: false, error: "Order not found" });
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: "Order not found" });
});

test("saldo kurang dan kuota habis memakai pesan untuk admin", async () => {
  reply(400, { success: false, error: "Bite points tidak cukup" });
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: lowBalance });
  reply(400, { success: false, error: "You have reached your monthly Orders API limit" });
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: quotaReached });
});

test("saldo habis saat cek ongkir tidak menyalahkan kode pos pembeli", async () => {
  reply(400, { success: false, error: "No sufficient balance to call rates API. Please top up your balance" });
  const quote = await quoteShipping("60111", [{ name: "Batik", price: 100_000, quantity: 1, weight: null }]);
  assert.deepStrictEqual(quote, { ok: false, error: "Layanan cek ongkir sedang gangguan. Coba lagi sebentar." });
});
