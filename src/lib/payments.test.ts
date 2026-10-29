import assert from "node:assert";
import { test } from "node:test";
import type { Payment } from "@/db/schema";
import { isActivePayment } from "@/lib/payments";

const now = new Date("2026-10-29T10:00:00Z");
const doku: Payment = {
  id: 1,
  orderId: 1,
  method: "doku",
  invoiceNumber: "SK261029AB1PP1",
  amount: 150000,
  url: "https://doku",
  expiresAt: new Date("2026-10-29T11:00:00Z"),
  paidAt: null,
  channel: null,
  requestId: null,
  cancelledAt: null,
  createdAt: now,
};

test("link DOKU yang belum dibayar dan belum kedaluwarsa aktif", () => {
  assert.ok(isActivePayment(doku, now));
  assert.ok(!isActivePayment({ ...doku, expiresAt: now }, now));
  assert.ok(!isActivePayment({ ...doku, cancelledAt: now }, now));
});

test("pembayaran manual tanpa link tidak pernah aktif, walau belum lunas", () => {
  assert.ok(!isActivePayment({ ...doku, method: "tunai", invoiceNumber: null, url: null, expiresAt: null }, now));
});
