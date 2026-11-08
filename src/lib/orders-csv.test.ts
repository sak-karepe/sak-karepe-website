import assert from "node:assert/strict";
import test from "node:test";
import { csvCell, csvDate, csvDelimiter, orderCsvHeader, orderCsvRow, ordersToCsv, type ExportOrder } from "@/lib/orders-csv";

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
  waybillId: null,
  externalRef: null,
  user: { name: "Budi, S.", email: "budi@example.com" },
  items: [{ productName: 'Busana "hijau"', quantity: 2 }],
  payments: [{ method: "doku", channel: "QRIS_DOKU", paidAt: new Date("2026-11-08T05:30:00Z") }],
};

test("csvCell memberi kutip untuk koma, kutip, dan baris baru", () => {
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('dia berkata "hai"'), '"dia berkata ""hai"""');
  assert.equal(csvCell("baris1\nbaris2"), '"baris1\nbaris2"');
  assert.equal(csvCell("biasa"), "biasa");
  assert.equal(csvCell(`a${csvDelimiter}b`), `"a${csvDelimiter}b"`);
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(12000), "12000");
});

test("csvCell menetralkan teks yang bisa dibaca sebagai rumus", () => {
  assert.equal(csvCell("=SUM(A1:A9)"), "'=SUM(A1:A9)");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell("+cmd"), "'+cmd");
  assert.equal(csvCell("+62 812-3456-789"), "+62 812-3456-789");
});

test("csvDate memakai WIB", () => {
  assert.equal(csvDate(new Date("2026-11-08T17:30:00Z")), "2026-11-09 00:30");
  assert.equal(csvDate(null), "");
});

test("online memakai tanggal bayar dan total = subtotal + ongkir", () => {
  const row = orderCsvRow(base);
  assert.equal(row[1], "2026-11-08 12:30");
  assert.equal(row[9], 309500);
  assert.equal(row[11], "doku (QRIS_DOKU)");
  assert.equal(row.length, orderCsvHeader.length);
});

test("pembeli tanpa akun: nama dan HP dari catatan admin, email kosong, tanggal dari createdAt", () => {
  const row = orderCsvRow({
    ...base,
    source: "langsung",
    user: null,
    customerName: "Ibu Sari",
    customerPhone: "08111",
    phone: null,
    payments: [{ method: "tunai", channel: null, paidAt: new Date("2026-11-08T01:00:00Z") }],
  });
  assert.equal(row[1], "2026-11-08 08:00");
  assert.equal(row[3], "Ibu Sari");
  assert.equal(row[4], "08111");
  assert.equal(row[5], "");
  assert.equal(row[11], "tunai");
});

test("harga konsultasi (subtotal kosong) tidak error dan totalnya kosong", () => {
  const row = orderCsvRow({ ...base, subtotal: null, shippingCost: null, payments: [] });
  assert.equal(row[7], null);
  assert.equal(row[9], null);
  assert.equal(row[1], "");
});

test("file diawali BOM UTF-8 dan memakai baris CRLF", () => {
  const csv = ordersToCsv([base]);
  assert.ok(csv.startsWith(`\uFEFFKode${csvDelimiter}`));
  assert.equal(csv.split("\r\n").length, 3);
  assert.ok(csv.includes('"Busana ""hijau"" ×2"'));
});