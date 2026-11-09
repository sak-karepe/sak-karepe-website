import assert from "node:assert/strict";
import test from "node:test";
import {
  byCollectionQuery,
  byMethodQuery,
  bySourceQuery,
  lowStockQuery,
  summaryQuery,
  topBuyersQuery,
  topProductsQuery,
  trendQuery,
  type Query,
} from "@/lib/report-sql";

// node:sqlite ada di Node 22.5+ dan belum dikenal @types/node 20, jadi diimpor dinamis dengan tipe longgar buatan sendiri.
// Pada Node yang lebih lama impor gagal dan tes ini dilewati.
type Statement = { run(...params: unknown[]): unknown; all(...params: unknown[]): unknown[] };
type Database = { exec(sql: string): void; prepare(sql: string): Statement };
const specifier = "node:sqlite";
const sqlite: { DatabaseSync: new (path: string) => Database } | null = await import(specifier).catch(() => null);
const t = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

function seed(): Database {
  const db = new sqlite!.DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE categories (slug TEXT PRIMARY KEY, title TEXT NOT NULL);
    CREATE TABLE products (id INTEGER PRIMARY KEY, category_slug TEXT, name TEXT, stock INTEGER, published INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, name TEXT);
    CREATE TABLE orders (id INTEGER PRIMARY KEY, source TEXT NOT NULL, status TEXT NOT NULL, user_id INTEGER, customer_name TEXT,
      customer_phone TEXT, subtotal INTEGER, shipping_cost INTEGER, created_at INTEGER NOT NULL);
    CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, product_name TEXT, price INTEGER, quantity INTEGER);
    CREATE TABLE payments (id INTEGER PRIMARY KEY, order_id INTEGER, method TEXT, amount INTEGER, paid_at INTEGER);
    INSERT INTO categories VALUES ('busana','Busana'),('tas','Tas');
    INSERT INTO products VALUES (1,'busana','Busana hijau',2,1),(2,'tas','Tas daun',0,1),(3,'tas','Tas lama',1,0),(4,'tas','Tas banyak',50,1),(5,'tas','Tas tanpa batas',NULL,1);
    INSERT INTO users VALUES (1,'budi@x.id','Budi'),(2,'sari@x.id',NULL);
  `);
  const order = (id: number, source: string, status: string, user: number | null, name: string | null, phone: string | null, sub: number | null, ship: number | null, created: string) =>
    db.prepare("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?)").run(id, source, status, user, name, phone, sub, ship, t(created));
  const item = (order: number, product: number | null, name: string, price: number, qty: number) =>
    db.prepare("INSERT INTO order_items (order_id, product_id, product_name, price, quantity) VALUES (?,?,?,?,?)").run(order, product, name, price, qty);
  const pay = (order: number, method: string, amount: number, paid: string | null) =>
    db.prepare("INSERT INTO payments (order_id, method, amount, paid_at) VALUES (?,?,?,?)").run(order, method, amount, paid ? t(paid) : null);

  // Periode uji: 1-30 November 2026 (WIB).
  // 1) online, dibuat 30 Okt tapi DIBAYAR 2 Nov -> masuk November (tanggal bayar), bukan Oktober.
  order(1, "online", "selesai", 1, null, null, 300000, 10000, "2026-10-30T10:00:00Z");
  item(1, 1, "Busana hijau", 150000, 2);
  pay(1, "doku", 310000, "2026-11-02T03:00:00Z");
  // 2) online, belum dibayar -> tidak punya tanggal transaksi.
  order(2, "online", "menunggu_pembayaran", 1, null, null, 999000, 5000, "2026-11-03T03:00:00Z");
  item(2, 2, "Tas daun", 999000, 1);
  pay(2, "doku", 1004000, null);
  // 3) online, dibayar 5 Nov, kemudian di-refund -> ada di omzet kotor, dikurangkan di omzet bersih.
  order(3, "online", "refund", 2, null, null, 200000, 8000, "2026-11-04T10:00:00Z");
  item(3, 2, "Tas daun", 200000, 1);
  pay(3, "doku", 208000, "2026-11-05T03:00:00Z");
  // 4) langsung (tunai), dibuat 10 Nov, tanpa akun.
  order(4, "langsung", "selesai", null, "Ibu Sari", "0811", 120000, null, "2026-11-10T03:00:00Z");
  item(4, 1, "Busana hijau (diganti nama)", 60000, 2);
  pay(4, "tunai", 120000, "2026-11-10T03:00:00Z");
  // 5) historis, tanpa pembayaran tercatat, 15 November.
  order(5, "historis", "selesai", null, "Pak Joko", null, 80000, null, "2026-11-15T03:00:00Z");
  item(5, null, "Kain lurik", 80000, 1);
  // 6) dibatalkan -> tidak pernah dihitung.
  order(6, "langsung", "dibatalkan", null, "Batal", null, 50000, null, "2026-11-12T03:00:00Z");
  // 7) tepat di batas: 30 Nov 23:30 WIB (= 16:30 UTC) masuk November; 1 Des 00:30 WIB tidak.
  order(7, "langsung", "selesai", null, "Akhir bulan", "0822", 10000, null, "2026-11-30T16:30:00Z");
  order(8, "langsung", "selesai", null, "Awal Desember", "0833", 77000, null, "2026-11-30T17:30:00Z");
  return db;
}

const nov = { from: t("2026-10-31T17:00:00Z"), to: t("2026-11-30T17:00:00Z") }; // 1-30 Nov WIB
const run = (db: Database, q: Query) => db.prepare(q.text).all(...q.params) as Record<string, number | string>[];

test("ringkasan: omzet kotor, refund, ongkir, dan transaksi mengikuti aturan tanggal bayar", { skip: !sqlite }, () => {
  const [row] = run(seed(), summaryQuery(undefined, nov));
  // kotor: 300.000 (#1) + 200.000 (#3 refund) + 120.000 + 80.000 + 10.000 = 710.000; #2 belum dibayar, #6 batal, #8 Desember
  assert.equal(row.gross, 710000);
  assert.equal(row.refund_count, 1);
  assert.equal(row.refund_value, 200000);
  assert.equal(row.transactions, 4); // #1, #4, #5, #7 (refund tidak dihitung)
  assert.equal(row.shipping, 10000); // ongkir #3 ikut dikembalikan, jadi tidak terkumpul
  assert.equal((row.gross as number) - (row.refund_value as number), 510000); // omzet bersih
});

test("omzet kotor laporan = jumlah Subtotal pesanan yang diexport CSV untuk periode itu", { skip: !sqlite }, () => {
  const db = seed();
  // Mereplikasi aturan filter export (lib/order-filter): online = ada pembayaran lunas dalam periode, selain itu = createdAt; tanpa dibatalkan.
  const [csv] = db
    .prepare(
      `SELECT SUM(COALESCE(subtotal,0)) AS total FROM orders WHERE status <> 'dibatalkan' AND (
        (source = 'online' AND id IN (SELECT order_id FROM payments WHERE paid_at >= ? AND paid_at < ?))
        OR (source <> 'online' AND created_at >= ? AND created_at < ?))`,
    )
    .all(nov.from, nov.to, nov.from, nov.to) as { total: number }[];
  const [report] = run(db, summaryQuery(undefined, nov));
  assert.equal(report.gross, csv.total);
});

test("filter sumber hanya menghitung sumber itu", { skip: !sqlite }, () => {
  const db = seed();
  assert.equal(run(db, summaryQuery("online", nov))[0].gross, 500000);
  assert.equal(run(db, summaryQuery("langsung", nov))[0].gross, 130000);
  assert.equal(run(db, summaryQuery("historis", nov))[0].gross, 80000);
});

test("periode kosong menghasilkan nol, bukan null", { skip: !sqlite }, () => {
  const [row] = run(seed(), summaryQuery(undefined, { from: t("2020-01-01T00:00:00Z"), to: t("2020-02-01T00:00:00Z") }));
  assert.deepEqual({ ...row }, { gross: 0, shipping: 0, transactions: 0, refund_count: 0, refund_value: 0 });
});

test("tren per hari memakai tanggal WIB dan tidak menghitung refund", { skip: !sqlite }, () => {
  const rows = run(seed(), trendQuery(undefined, nov, "day"));
  const byDay = Object.fromEntries(rows.map((r) => [r.bucket, r.net]));
  assert.equal(byDay["2026-11-02"], 300000);
  assert.equal(byDay["2026-11-05"], 0); // hanya refund
  assert.equal(byDay["2026-11-10"], 120000);
  assert.equal(byDay["2026-11-30"], 10000); // 23:30 WIB masih tanggal 30
  assert.equal(byDay["2026-12-01"], undefined);
  const months = run(seed(), trendQuery(undefined, { from: nov.from, to: t("2026-12-31T17:00:00Z") }, "month"));
  assert.deepEqual(months.map((r) => [r.bucket, r.net]), [["2026-11", 510000], ["2026-12", 77000]]);
});

test("rincian per sumber dan per metode bayar", { skip: !sqlite }, () => {
  const db = seed();
  const bySource = Object.fromEntries(run(db, bySourceQuery(undefined, nov)).map((r) => [r.name, r.value]));
  assert.deepEqual(bySource, { online: 300000, langsung: 130000, historis: 80000 });
  const byMethod = Object.fromEntries(run(db, byMethodQuery(undefined, nov)).map((r) => [r.name, r.value]));
  assert.deepEqual(byMethod, { doku: 300000, tunai: 120000, "tidak-tercatat": 90000 });
});

test("rincian per koleksi, produk terlaris, dan pembeli teratas (tanpa refund)", { skip: !sqlite }, () => {
  const db = seed();
  const collections = Object.fromEntries(run(db, byCollectionQuery(undefined, nov)).map((r) => [r.name, [r.quantity, r.value]]));
  assert.deepEqual(collections, { Busana: [4, 420000], "Tanpa koleksi": [1, 80000] });
  const products = run(db, topProductsQuery(undefined, nov));
  // produk id 1 digabung walau namanya berbeda di pesanan #4
  assert.equal(products[0].quantity, 4);
  assert.equal(products[0].value, 420000);
  const buyers = run(db, topBuyersQuery(undefined, nov));
  assert.equal(buyers[0].name, "Budi");
  assert.equal(buyers[0].value, 300000);
  assert.ok(buyers.some((b) => b.name === "Ibu Sari" && b.value === 120000));
  assert.ok(!buyers.some((b) => b.name === "Sari"), "pembeli yang hanya punya pesanan refund tidak muncul");
});

test("stok menipis dan habis hanya untuk produk tampil dengan stok terbatas", { skip: !sqlite }, () => {
  const rows = run(seed(), lowStockQuery(5));
  assert.deepEqual(rows.map((r) => [r.name, r.stock]), [["Tas daun", 0], ["Busana hijau", 2]]);
});