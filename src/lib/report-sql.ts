/**
 * Query agregasi laporan penjualan sebagai teks SQL + parameter (tanpa ORM), agar bisa diuji langsung pada SQLite.
 * Semua penjumlahan dilakukan di SQL (sum/group by), tidak memuat baris pesanan ke JS.
 *
 * Aturan hitung (juga ditulis di halaman /admin/laporan):
 * - Transaksi = pesanan selain "dibatalkan" yang punya tanggal transaksi dalam periode. Tanggal transaksi = tanggal bayar
 *   pertama untuk sumber online (belum dibayar = belum ada tanggal, jadi tidak ikut), dan tanggal dibuat untuk
 *   langsung/historis. Aturan yang sama dipakai export Excel (lib/order-filter), jadi total kolom Subtotal export = omzet laporan.
 * - Omzet = jumlah subtotal (tanpa ongkir). Pesanan berstatus "refund" tetap ada di omzet lalu dikurangkan: omzet bersih
 *   = omzet - nilai refund. Jumlah transaksi, rata-rata, dan semua rincian tidak menghitung pesanan refund.
 */
export type Range = { from: number; to: number };
export type Query = { text: string; params: (string | number)[] };
export const sources = ["online", "langsung", "historis"] as const;
export type Source = (typeof sources)[number];

/** Selisih WIB terhadap UTC dalam detik, untuk mengelompokkan per hari/bulan lokal. */
const WIB_SECONDS = 7 * 60 * 60;

/** CTE bersama: `paid` = pembayaran lunas paling awal per pesanan; `tx` = pesanan beserta tanggal transaksinya (`at`). */
function base(source?: Source): Query {
  return {
    text: `WITH paid AS (
  SELECT order_id, paid_at, method FROM (
    SELECT order_id, paid_at, method,
      ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY paid_at, id) AS rn
    FROM payments WHERE paid_at IS NOT NULL
  ) WHERE rn = 1
), tx AS (
  SELECT o.id, o.source, o.status, o.user_id, o.customer_name, o.customer_phone,
    COALESCE(o.subtotal, 0) AS subtotal, COALESCE(o.shipping_cost, 0) AS shipping, paid.method AS method,
    CASE WHEN o.source = 'online' THEN paid.paid_at ELSE o.created_at END AS at
  FROM orders o LEFT JOIN paid ON paid.order_id = o.id
  WHERE o.status <> 'dibatalkan'${source ? " AND o.source = ?" : ""}
)`,
    params: source ? [source] : [],
  };
}

function query(source: Source | undefined, range: Range, select: string): Query {
  const b = base(source);
  return { text: `${b.text}\n${select}`, params: [...b.params, range.from, range.to] };
}

const inRange = "WHERE tx.at >= ? AND tx.at < ?";
const net = "tx.status <> 'refund'";

/** gross, shipping, transactions, refund_count, refund_value. */
export const summaryQuery = (source: Source | undefined, range: Range) =>
  query(
    source,
    range,
    `SELECT
  COALESCE(SUM(tx.subtotal), 0) AS gross,
  COALESCE(SUM(CASE WHEN ${net} THEN tx.shipping ELSE 0 END), 0) AS shipping,
  COALESCE(SUM(CASE WHEN ${net} THEN 1 ELSE 0 END), 0) AS transactions,
  COALESCE(SUM(CASE WHEN tx.status = 'refund' THEN 1 ELSE 0 END), 0) AS refund_count,
  COALESCE(SUM(CASE WHEN tx.status = 'refund' THEN tx.subtotal ELSE 0 END), 0) AS refund_value
FROM tx ${inRange}`,
  );

/** bucket ("YYYY-MM-DD" atau "YYYY-MM"), net (omzet bersih), transactions. */
export const trendQuery = (source: Source | undefined, range: Range, granularity: "day" | "month") =>
  query(
    source,
    range,
    `SELECT strftime('${granularity === "day" ? "%Y-%m-%d" : "%Y-%m"}', tx.at + ${WIB_SECONDS}, 'unixepoch') AS bucket,
  COALESCE(SUM(CASE WHEN ${net} THEN tx.subtotal ELSE 0 END), 0) AS net,
  COALESCE(SUM(CASE WHEN ${net} THEN 1 ELSE 0 END), 0) AS transactions
FROM tx ${inRange}
GROUP BY bucket ORDER BY bucket`,
  );

/** name (source), value, transactions. */
export const bySourceQuery = (source: Source | undefined, range: Range) =>
  query(
    source,
    range,
    `SELECT tx.source AS name, COALESCE(SUM(tx.subtotal), 0) AS value, COUNT(*) AS transactions
FROM tx ${inRange} AND ${net}
GROUP BY tx.source ORDER BY value DESC`,
  );

/** name (method atau "tidak-tercatat"), value, transactions. */
export const byMethodQuery = (source: Source | undefined, range: Range) =>
  query(
    source,
    range,
    `SELECT COALESCE(tx.method, 'tidak-tercatat') AS name, COALESCE(SUM(tx.subtotal), 0) AS value, COUNT(*) AS transactions
FROM tx ${inRange} AND ${net}
GROUP BY COALESCE(tx.method, 'tidak-tercatat') ORDER BY value DESC`,
  );

/** name (judul koleksi), quantity, value; dihitung dari item pesanan. */
export const byCollectionQuery = (source: Source | undefined, range: Range) =>
  query(
    source,
    range,
    `SELECT MAX(COALESCE(c.title, 'Tanpa koleksi')) AS name, COALESCE(SUM(i.quantity), 0) AS quantity,
  COALESCE(SUM(COALESCE(i.price, 0) * i.quantity), 0) AS value
FROM tx
JOIN order_items i ON i.order_id = tx.id
LEFT JOIN products p ON p.id = i.product_id
LEFT JOIN categories c ON c.slug = p.category_slug
${inRange} AND ${net}
GROUP BY c.slug ORDER BY value DESC`,
  );

/** name, quantity, value; produk yang sama (id) digabung walau namanya pernah berubah. */
export const topProductsQuery = (source: Source | undefined, range: Range, limit = 10) =>
  query(
    source,
    range,
    `SELECT MAX(i.product_name) AS name, SUM(i.quantity) AS quantity, COALESCE(SUM(COALESCE(i.price, 0) * i.quantity), 0) AS value
FROM tx
JOIN order_items i ON i.order_id = tx.id
${inRange} AND ${net}
GROUP BY COALESCE('p' || i.product_id, 'n' || i.product_name)
ORDER BY quantity DESC, value DESC LIMIT ${Math.trunc(limit)}`,
  );

/** name, email, transactions, value; pembeli tanpa akun dikelompokkan menurut nomor HP/nama yang dicatat admin. */
export const topBuyersQuery = (source: Source | undefined, range: Range, limit = 10) =>
  query(
    source,
    range,
    `SELECT MAX(COALESCE(u.name, u.email, tx.customer_name, 'Pembeli langsung')) AS name, MAX(u.email) AS email,
  COUNT(*) AS transactions, COALESCE(SUM(tx.subtotal), 0) AS value
FROM tx
LEFT JOIN users u ON u.id = tx.user_id
${inRange} AND ${net}
GROUP BY COALESCE('u' || tx.user_id, 'c' || COALESCE(tx.customer_phone, tx.customer_name, tx.id))
ORDER BY value DESC LIMIT ${Math.trunc(limit)}`,
  );

/** Produk tampil dengan stok terbatas yang tersisa `threshold` atau kurang (0 = habis), paling sedikit lebih dulu. */
export const lowStockQuery = (threshold: number): Query => ({
  text: `SELECT id, name, stock FROM products
WHERE published = 1 AND stock IS NOT NULL AND stock <= ?
ORDER BY stock, name`,
  params: [threshold],
});