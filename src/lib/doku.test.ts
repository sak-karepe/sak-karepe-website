import assert from "node:assert";
import { createHash, createHmac } from "node:crypto";
import { test } from "node:test";
import { verifyNotification } from "@/lib/doku";

process.env.DOKU_CLIENT_ID = "BRN-test";
process.env.DOKU_SECRET_KEY = "rahasia";
const target = "/api/doku/notification";
const body = JSON.stringify({ order: { invoice_number: "SK261023Y7D3P1", amount: 150000 }, transaction: { status: "SUCCESS" } });

// Signature dihitung terpisah dari lib/doku, mengikuti dokumentasi DOKU, agar salah tanda tangan di sana ketahuan.
function headers(payload: string, overrides: Record<string, string> = {}) {
  const digest = createHash("sha256").update(payload).digest("base64");
  const component = `Client-Id:BRN-test\nRequest-Id:req-1\nRequest-Timestamp:2026-10-29T10:00:00Z\nRequest-Target:${target}\nDigest:${digest}`;
  return new Headers({
    "Client-Id": "BRN-test",
    "Request-Id": "req-1",
    "Request-Timestamp": "2026-10-29T10:00:00Z",
    Signature: `HMACSHA256=${createHmac("sha256", "rahasia").update(component).digest("base64")}`,
    ...overrides,
  });
}

test("notifikasi DOKU yang sah diterima", () => {
  assert.ok(verifyNotification(headers(body), body, target));
});

test("isi, client, atau signature yang diubah ditolak", () => {
  assert.ok(!verifyNotification(headers(body), body.replace("150000", "1"), target));
  assert.ok(!verifyNotification(headers(body, { "Client-Id": "BRN-lain" }), body, target));
  assert.ok(!verifyNotification(headers(body, { Signature: "HMACSHA256=palsu" }), body, target));
  assert.ok(!verifyNotification(headers(body), body, "/lain"));
});
