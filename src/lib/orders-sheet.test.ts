import assert from "node:assert/strict";
import test from "node:test";
import {
  columnName,
  excelSerial,
  orderColumns,
  orderRow,
  orderSheet,
  rupiahFormat,
  sortByTransactionDate,
  toCell,
  transactionDate,
  type ExportOrder,
} from "@/lib/orders-sheet";

const base: ExportOrder = {
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
  externalRef: "0042",
  user: { name: "Budi, S.", email: "budi@example.com" },
  items: [{ productName: '=Busana "hijau"', quantity: 2 }],
  payments: [{ method: "doku", channel: "QRIS_DOKU", paidAt: new Date("2026-11-08T05:30:00Z") }],
};

test("nomor seri tanggal Excel memakai WIB (2026-11-08 12:30 = 46334.5208…)", () => {
  assert.ok(Math.abs(excelSerial(new Date("2026-11-08T05:30:00Z")) - 46334.520833) < 0.00001);
  assert.ok(Math.abs(excelSerial(new Date("2026-11-08T17:30:00Z")) - 46335.020833) < 0.00001); // sudah lewat tengah malam WIB
});

test("kode, No. HP, No. nota, dan Resi menjadi sel teks dan angka nol di depan terjaga", () => {
  const { cells } = orderSheet([base]);
  for (const ref of ["A2", "E2", "M2", "O2"]) assert.equal(cells[ref].t, "s", ref);
  assert.equal(cells.E2.v, "081234567890");
  assert.equal(cells.M2.v, "0042");
  assert.equal(cells.O2.v, "000123456789012345");
});

test("Subtotal, Ongkir, dan Total menjadi angka berformat Rupiah", () => {
  const { cells } = orderSheet([base]);
  assert.deepEqual(cells.H2, { t: "n", v: 300000, z: rupiahFormat });
  assert.deepEqual(cells.I2, { t: "n", v: 9500, z: rupiahFormat });
  assert.deepEqual(cells.J2, { t: "n", v: 309500, z: rupiahFormat });
  assert.equal(rupiahFormat, '"Rp" #,##0');
});

test("Tanggal transaksi dan Tanggal bayar menjadi sel tanggal (angka seri berformat tanggal), bukan teks", () => {
  const { cells } = orderSheet([base]);
  for (const ref of ["B2", "P2"]) {
    assert.equal(cells[ref].t, "n", ref);
    assert.equal(cells[ref].z, "yyyy-mm-dd hh:mm", ref);
    assert.ok(Math.abs((cells[ref].v as number) - 46334.520833) < 0.00001, ref);
  }
});

test("teks yang diawali = tetap teks biasa tanpa awalan tambahan", () => {
  const { cells } = orderSheet([base]);
  assert.equal(cells.G2.t, "s");
  assert.equal(cells.G2.v, '=Busana "hijau" ×2');
});

test("sel kosong tidak dibuat: harga konsultasi, pembeli tanpa email, online belum dibayar", () => {
  const { cells } = orderSheet([{ ...base, subtotal: null, shippingCost: null, user: null, customerName: "Ibu Sari", customerPhone: "0811", phone: null, payments: [] }]);
  for (const ref of ["B2", "F2", "H2", "I2", "J2", "L2", "P2"]) assert.equal(cells[ref], undefined, ref);
  assert.equal(cells.D2.v, "Ibu Sari");
  assert.equal(cells.E2.v, "0811");
});

test("penjualan langsung: tanggal transaksi = tanggal dibuat, metode tunai", () => {
  const order: ExportOrder = { ...base, source: "langsung", payments: [{ method: "tunai", channel: null, paidAt: new Date("2026-11-10T03:00:00Z") }] };
  assert.equal(transactionDate(order)?.toISOString(), base.createdAt.toISOString());
  assert.equal(orderRow(order)[11], "tunai");
});

test("header, rentang lembar, dan lebar kolom", () => {
  const { cells, ref, widths } = orderSheet([base, { ...base, code: "SK-2" }]);
  assert.equal(cells.A1.v, "Kode");
  assert.equal(cells.P1.v, "Tanggal bayar");
  assert.equal(ref, "A1:P3");
  assert.equal(orderSheet([]).ref, "A1:P1");
  assert.equal(widths.length, orderColumns.length);
  assert.ok(widths.every((width) => width > 0));
});

test("diurutkan menurut tanggal transaksi (terbaru dulu), online belum dibayar di bawah", () => {
  const paidLate = { ...base, code: "B-LAMA-DIBUAT-BARU-DIBAYAR", createdAt: new Date("2026-10-01T00:00:00Z"), payments: [{ method: "doku", channel: null, paidAt: new Date("2026-11-20T00:00:00Z") }] };
  const paidEarly = { ...base, code: "A-BARU-DIBUAT-LAMA-DIBAYAR", createdAt: new Date("2026-11-19T00:00:00Z"), payments: [{ method: "doku", channel: null, paidAt: new Date("2026-11-05T00:00:00Z") }] };
  const unpaid = { ...base, code: "C-BELUM-BAYAR", createdAt: new Date("2026-11-25T00:00:00Z"), payments: [] };
  const direct = { ...base, code: "D-LANGSUNG", source: "langsung" as const, createdAt: new Date("2026-11-12T00:00:00Z") };
  assert.deepEqual(sortByTransactionDate([paidEarly, unpaid, direct, paidLate]).map((order) => order.code), [
    "B-LAMA-DIBUAT-BARU-DIBAYAR",
    "D-LANGSUNG",
    "A-BARU-DIBUAT-LAMA-DIBAYAR",
    "C-BELUM-BAYAR",
  ]);
});

test("toCell dan columnName", () => {
  assert.equal(toCell("", "text"), null);
  assert.equal(toCell(null, "rupiah"), null);
  assert.deepEqual(toCell(5, "text"), { t: "n", v: 5 });
  assert.equal(columnName(0), "A");
  assert.equal(columnName(25), "Z");
  assert.equal(columnName(26), "AA");
});