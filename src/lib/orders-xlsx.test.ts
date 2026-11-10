import assert from "node:assert/strict";
import test from "node:test";
import * as XLSX from "xlsx";
import { ordersToXlsx } from "@/lib/orders-xlsx";
import type { ExportOrder } from "@/lib/orders-sheet";

// Uji bolak-balik dengan library xlsx sungguhan: file yang ditulis dibaca lagi dan tipe selnya diperiksa.
const order: ExportOrder = {
  code: "SK-261108-ABCD",
  source: "online",
  createdAt: new Date("2026-11-08T01:00:00Z"),
  customerName: null,
  customerPhone: null,
  phone: "081234567890",
  subtotal: 300000,
  shippingCost: 9500,
  status: "dibayar",
  courierName: "J&T EZ",
  waybillId: "000123456789012345",
  externalRef: null,
  user: { name: "Budi", email: "budi@example.com" },
  items: [{ productName: "Busana hijau", quantity: 1 }],
  payments: [{ method: "doku", channel: "QRIS_DOKU", paidAt: new Date("2026-11-08T05:30:00Z") }],
};

function read() {
  const workbook = XLSX.read(ordersToXlsx([order]), { type: "buffer" });
  assert.deepEqual(workbook.SheetNames, ["Pesanan"]);
  return workbook.Sheets.Pesanan;
}

test("file xlsx valid dan bisa dibaca kembali", () => {
  const sheet = read();
  assert.equal(sheet.A1.v, "Kode");
  assert.equal(sheet.A2.v, "SK-261108-ABCD");
});

test("No. HP dan Resi tersimpan sebagai teks, nol di depan tidak hilang", () => {
  const sheet = read();
  assert.equal(sheet.E2.t, "s");
  assert.equal(sheet.E2.v, "081234567890");
  assert.equal(sheet.O2.t, "s");
  assert.equal(sheet.O2.v, "000123456789012345");
});

test("Subtotal, Ongkir, dan Total berupa angka berformat Rp", () => {
  const sheet = read();
  for (const [ref, value] of [["H2", 300000], ["I2", 9500], ["J2", 309500]] as const) {
    assert.equal(sheet[ref].t, "n", ref);
    assert.equal(sheet[ref].v, value, ref);
    assert.match(String(sheet[ref].z), /Rp/, ref);
  }
});

test("kedua kolom tanggal berupa angka seri berformat tanggal (WIB)", () => {
  const sheet = read();
  for (const ref of ["B2", "P2"]) {
    assert.ok(Math.abs((sheet[ref].v as number) - 46334.520833) < 0.0001, ref);
    assert.match(String(sheet[ref].z), /yyyy/, ref);
  }
});

test("lebar kolom diatur dan header punya autofilter", () => {
  const sheet = read();
  assert.ok((sheet["!cols"]?.[0]?.wch ?? 0) >= 19);
  assert.equal(sheet["!autofilter"]?.ref, "A1:P2");
});