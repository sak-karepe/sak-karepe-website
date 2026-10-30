import assert from "node:assert/strict";
import { test } from "node:test";
import { historicalHeaders, historicalTemplate, parseCsv, parseHistoricalDate, validateHistoricalCsv } from "@/lib/historical-csv";

const csv = (row: string) => historicalHeaders.join(",") + "\r\n" + row;

test("CSV mendukung koma, kutipan ganda, BOM, CRLF dan baris baru dalam nilai", () => {
  assert.deepEqual(parseCsv('\uFEFFnama,catatan\r\n"Tas, daun","Pesan ""biru""\r\nlanjut"\r\n').rows, [
    { line: 1, values: ["nama", "catatan"] },
    { line: 2, values: ["Tas, daun", 'Pesan "biru"\r\nlanjut'] },
  ]);
  assert.equal(parseCsv('a,b\n"c\nd",e\nf,g').rows[2].line, 4);
  for (const value of ['"belum tutup', 'a"b,c', '"a"b,c']) assert.ok(parseCsv(value).errors.length);
});

test("DD/MM/YYYY dan ISO disimpan pada awal hari WIB; kalender invalid ditolak", () => {
  assert.equal(parseHistoricalDate("29/02/2024")?.toISOString(), "2024-02-28T17:00:00.000Z");
  assert.equal(parseHistoricalDate("2024-02-29")?.toISOString(), "2024-02-28T17:00:00.000Z");
  for (const date of ["29/02/2023", "31/04/2024", "2024-13-01", "00/01/2024", "01/01/0000", "01/01/24"])
    assert.equal(parseHistoricalDate(date), null, date);
});

test("template valid dan nomor HP tetap teks dengan nol di depan", () => {
  const result = validateHistoricalCsv(historicalTemplate);
  assert.deepEqual(result.errors, []);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].customerPhone, "081234567890");
  assert.equal(result.rows[0].productName, "Tas, motif daun");
});

test("validasi melaporkan nomor baris untuk tanggal, qty, harga, ongkir dan metode salah", () => {
  const result = validateHistoricalCsv(csv("31/02/2024,N1,Sari,,Tas,,bukan angka,-1,kartu,"));
  assert.equal(result.errors.length, 5);
  assert.ok(result.errors.every((error) => error.line === 2));
  for (const row of [
    "01/01/2020,,Sari,,Tas,1,100,0,tunai,",
    "01/01/2020,N1,,,Tas,1,100,0,tunai,",
    "01/01/2020,N1,Sari,,,1,100,0,tunai,",
    "01/01/2020,N1,Sari,,Tas,0,100,0,tunai,",
    "01/01/2020,N1,Sari,,Tas,1.5,100,0,tunai,",
    "01/01/2020,N1,Sari,,Tas,1,100,0,tunai",
    "01/01/2020,N1,Sari,,Tas,9007199254740991,100,0,tunai,",
  ]) assert.ok(validateHistoricalCsv(csv(row)).errors.length, row);
});

test("baris salah tidak mengganti acuan metadata nota pada baris berikutnya", () => {
  const first = "01/01/2020,N1,Sari,,Tas,1,100,0,tunai,";
  const result = validateHistoricalCsv(csv([
    first,
    first.replace("Sari", "Budi"),
    first,
  ].join("\n")));
  assert.deepEqual(result.errors.map((error) => error.line), [3]);
});

test("metadata nota harus konsisten, baris kosong diabaikan, header dan batas file divalidasi", () => {
  const first = "01/01/2020,N1,Sari,,Tas,1,100,0,tunai,";
  assert.equal(validateHistoricalCsv(csv(first + "\n\n" + first.replace("Sari", "Budi"))).errors[0].line, 4);
  assert.deepEqual(validateHistoricalCsv(csv(first + "\n\n" + first)).errors, []);
  assert.ok(validateHistoricalCsv("tanggal,nota\n1,N1").errors.length);
  assert.ok(validateHistoricalCsv(historicalHeaders.join(",")).errors.length);
  assert.ok(validateHistoricalCsv("a".repeat(200001)).errors.length);
  assert.ok(validateHistoricalCsv(csv((first + "\n").repeat(1001))).errors.length);
});
