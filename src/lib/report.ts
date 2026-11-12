import { db } from "@/db";
import { bucketKeys, type Period } from "@/lib/report-period";
import {
  byCollectionQuery,
  byMethodQuery,
  expensesQuery,
  bySourceQuery,
  lowStockQuery,
  summaryQuery,
  topBuyersQuery,
  topProductsQuery,
  trendQuery,
  type Query,
  type Source,
} from "@/lib/report-sql";

/** Produk dengan stok sebanyak ini atau kurang masuk laporan "stok menipis" (0 = habis). */
export const lowStockThreshold = 5;

export const exec = async (query: Query) => (await db.$client.execute({ sql: query.text, args: query.params })).rows as unknown as Record<string, unknown>[];
const num = (value: unknown) => Number(value ?? 0);
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);
const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export type Totals = {
  /** Omzet kotor tanpa ongkir, termasuk pesanan yang kemudian di-refund. */
  gross: number;
  shipping: number;
  transactions: number;
  refundCount: number;
  refundValue: number;
  /** Omzet bersih = omzet kotor - nilai refund. */
  net: number;
  average: number;
};

function totals(row: Record<string, unknown> | undefined): Totals {
  const gross = num(row?.gross);
  const refundValue = num(row?.refund_value);
  const transactions = num(row?.transactions);
  const net = gross - refundValue;
  return {
    gross,
    shipping: num(row?.shipping),
    transactions,
    refundCount: num(row?.refund_count),
    refundValue,
    net,
    average: transactions ? Math.round(net / transactions) : 0,
  };
}

export type Row = { name: string; value: number; transactions?: number; quantity?: number; email?: string | null };

const rows = (data: Record<string, unknown>[]): Row[] =>
  data.map((row) => ({
    name: String(row.name),
    value: num(row.value),
    transactions: row.transactions === undefined ? undefined : num(row.transactions),
    quantity: row.quantity === undefined ? undefined : num(row.quantity),
    email: row.email === undefined ? undefined : (row.email as string | null),
  }));

/** Seluruh data halaman /admin/laporan untuk satu periode dan (opsional) satu sumber. Semua agregasi dikerjakan di SQL. */
export async function getReport(period: Period, source?: Source) {
  const range = { from: seconds(period.from), to: seconds(period.to) };
  const prev = { from: seconds(period.prevFrom), to: seconds(period.prevTo) };
  const [summary, prevSummary, trend, prevTrend, bySource, byMethod, byCollection, products, buyers, stock, expenseRows] = await Promise.all([
    exec(summaryQuery(source, range)),
    exec(summaryQuery(source, prev)),
    exec(trendQuery(source, range, period.granularity)),
    exec(trendQuery(source, prev, period.granularity)),
    exec(bySourceQuery(source, range)),
    exec(byMethodQuery(source, range)),
    exec(byCollectionQuery(source, range)),
    exec(topProductsQuery(source, range)),
    exec(topBuyersQuery(source, range)),
    exec(lowStockQuery(lowStockThreshold)),
    exec(expensesQuery(range)),
  ]);

  // Setiap hari/bulan dalam periode ditampilkan, yang tidak ada transaksi bernilai 0; periode pembanding disejajarkan per urutan.
  const keys = bucketKeys(period.from, period.to, period.granularity);
  const byBucket = (data: Record<string, unknown>[]) => new Map(data.map((row) => [String(row.bucket), num(row.net)]));
  const currentMap = byBucket(trend);
  const prevKeys = bucketKeys(period.prevFrom, period.prevTo, period.granularity).slice(0, keys.length);
  const prevMap = byBucket(prevTrend);
  const chart = {
    labels: keys.map((key) => (period.granularity === "day" ? String(Number(key.slice(8))) : monthNames[Number(key.slice(5)) - 1])),
    titles: keys.map((key) =>
      period.granularity === "day"
        ? `${Number(key.slice(8))} ${monthNames[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`
        : `${monthNames[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}`,
    ),
    current: keys.map((key) => currentMap.get(key) ?? 0),
    previous: prevKeys.map((key) => prevMap.get(key) ?? 0),
  };

  const expenseList = expenseRows.map((row) => ({ category: String(row.category), value: num(row.value) }));
  const expenseTotal = expenseList.reduce((sum, row) => sum + row.value, 0);
  const net = totals(summary[0]).net;

  const stockRows = stock.map((row) => ({ id: num(row.id), name: String(row.name), stock: num(row.stock) }));
  return {
    totals: totals(summary[0]),
    previous: totals(prevSummary[0]),
    chart,
    bySource: rows(bySource),
    byMethod: rows(byMethod),
    byCollection: rows(byCollection),
    products: rows(products),
    buyers: rows(buyers),
    /** Laba = omzet bersih - semua pengeluaran periode; pengeluaran tidak dipisah per sumber. */
    profit: { expenses: expenseList, expenseTotal, profit: net - expenseTotal },
    stock: { out: stockRows.filter((row) => row.stock === 0), low: stockRows.filter((row) => row.stock > 0) },
  };
}