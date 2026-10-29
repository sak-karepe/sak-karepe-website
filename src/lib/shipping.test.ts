import assert from "node:assert";
import { test } from "node:test";
import { getShipment, unreachable } from "@/lib/shipping";

process.env.BITESHIP_API_KEY = "biteship_test.key";

// Webhook Biteship hanya diulang bila galatnya `unreachable`, jadi pemetaan status HTTP ini menentukan retry.
const reply = (status: number, body: unknown) => {
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status });
};

test("HTTP 5xx dan galat jaringan dianggap gangguan", async () => {
  reply(503, { success: false, error: "Service Unavailable" });
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: unreachable });
  globalThis.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: unreachable });
});

test("penolakan HTTP 4xx memakai pesan Biteship", async () => {
  reply(400, { success: false, error: "Order not found" });
  assert.deepStrictEqual(await getShipment("abc"), { ok: false, error: "Order not found" });
});
