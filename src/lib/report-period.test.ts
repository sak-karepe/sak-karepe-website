import assert from "node:assert/strict";
import test from "node:test";
import { bucketKeys, formatDay, percentChange, resolvePeriod } from "@/lib/report-period";

// 8 November 2026 12:00 WIB
const now = new Date("2026-11-08T05:00:00Z");

test("bulan ini: dari tanggal 1 sampai hari ini (WIB), pembanding bulan lalu sepanjang hari yang sama", () => {
  const p = resolvePeriod({ periode: "bulan-ini" }, now);
  assert.equal(formatDay(p.from), "2026-11-01");
  assert.equal(p.toDay, "2026-11-08");
  assert.equal(formatDay(p.prevFrom), "2026-10-01");
  assert.equal(formatDay(new Date(p.prevTo.getTime() - 1)), "2026-10-08");
  assert.equal(p.granularity, "day");
});

test("batas hari memakai WIB: 00:30 WIB tanggal 9 masih dihitung hari tanggal 9, bukan 8", () => {
  const p = resolvePeriod({ periode: "bulan-ini" }, new Date("2026-11-08T17:30:00Z"));
  assert.equal(p.toDay, "2026-11-09");
});

test("bulan lalu: satu bulan penuh, pembanding bulan sebelumnya", () => {
  const p = resolvePeriod({ periode: "bulan-lalu" }, now);
  assert.equal(formatDay(p.from), "2026-10-01");
  assert.equal(p.toDay, "2026-10-31");
  assert.equal(formatDay(p.prevFrom), "2026-09-01");
  assert.equal(p.prevTo.getTime(), p.from.getTime());
});

test("bulan lalu dari Januari menyeberang tahun", () => {
  const p = resolvePeriod({ periode: "bulan-lalu" }, new Date("2026-01-15T05:00:00Z"));
  assert.equal(formatDay(p.from), "2025-12-01");
  assert.equal(p.toDay, "2025-12-31");
});

test("pembanding tidak melewati awal periode saat bulan sebelumnya lebih pendek", () => {
  const p = resolvePeriod({ periode: "bulan-ini" }, new Date("2026-03-31T05:00:00Z"));
  assert.equal(formatDay(new Date(p.prevTo.getTime() - 1)), "2026-02-28");
  assert.ok(p.prevTo.getTime() <= p.from.getTime());
});

test("tahun ini: per bulan, pembanding tahun lalu", () => {
  const p = resolvePeriod({ periode: "tahun-ini" }, now);
  assert.equal(formatDay(p.from), "2026-01-01");
  assert.equal(p.granularity, "month");
  assert.equal(formatDay(p.prevFrom), "2025-01-01");
  assert.equal(bucketKeys(p.from, p.to, "month").length, 11);
  assert.equal(bucketKeys(p.prevFrom, p.prevTo, "month").length, 11);
});

test("rentang bebas: inklusif, pembanding sepanjang rentang tepat sebelumnya", () => {
  const p = resolvePeriod({ periode: "rentang", dari: "2026-10-10", sampai: "2026-10-19" }, now);
  assert.equal(p.fromDay, "2026-10-10");
  assert.equal(p.toDay, "2026-10-19");
  assert.equal(formatDay(p.prevFrom), "2026-09-30");
  assert.equal(p.prevTo.getTime(), p.from.getTime());
  assert.equal(bucketKeys(p.from, p.to, "day").length, 10);
});

test("rentang terbalik ditukar, tanggal ngawur jatuh ke bulan berjalan, rentang panjang per bulan", () => {
  const swapped = resolvePeriod({ periode: "rentang", dari: "2026-10-19", sampai: "2026-10-10" }, now);
  assert.equal(swapped.fromDay, "2026-10-10");
  const bad = resolvePeriod({ periode: "rentang", dari: "bukan-tanggal", sampai: "2026-02-31" }, now);
  assert.equal(bad.fromDay, "2026-11-01");
  const long = resolvePeriod({ periode: "rentang", dari: "2026-01-01", sampai: "2026-10-31" }, now);
  assert.equal(long.granularity, "month");
  assert.equal(resolvePeriod({ periode: "ngawur" }, now).key, "bulan-ini");
});

test("percentChange", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(10, 0), null);
});