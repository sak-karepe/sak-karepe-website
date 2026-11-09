import { and, eq, gte, inArray, like, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { orderSources, orders, payments } from "@/db/schema";
import { isOrderStatus } from "@/lib/order-status";

export type OrderFilterParams = { status?: string; q?: string; sumber?: string; dari?: string; sampai?: string; tanpaBatal?: string };

const WIB = 7 * 60 * 60 * 1000;

/** "2026-11-08" menjadi awal hari itu menurut WIB; null bila bukan tanggal yang valid. */
function dayStartWIB(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return new Date(date.getTime() - WIB);
}

/**
 * Filter pesanan yang dipakai bersama oleh daftar /admin/pesanan dan export CSV, supaya export selalu mengikuti filter yang
 * sedang aktif di daftar.
 * - `status`: satu status valid (isOrderStatus), yang lain diabaikan.
 * - `q`: angka saja dicocokkan persis ke ID pesanan; selain itu ke potongan kode, mis. "Y7D3" atau "SK-261023".
 * - `sumber`: online | langsung | historis.
 * - `tanpaBatal=1`: sembunyikan pesanan dibatalkan (dipakai tombol export di /admin/laporan agar total sama dengan laporan).
 * - `dari` / `sampai` (YYYY-MM-DD, inklusif, WIB): tanggal transaksi = tanggal bayar untuk pesanan online, tanggal dibuat
 *   untuk langsung/historis.
 * `base` = semua filter kecuali status (untuk menghitung jumlah per tab); `where` = base + status.
 */
export function parseOrderFilter(params: OrderFilterParams) {
  const status = isOrderStatus(params.status) ? params.status : undefined;
  const query = (params.q ?? "").trim().toUpperCase();
  const search = !query ? undefined : /^\d+$/.test(query) ? eq(orders.id, Number(query)) : like(orders.code, `%${query}%`);
  const source = orderSources.find((value) => value === params.sumber);

  const from = dayStartWIB(params.dari);
  const afterEnd = dayStartWIB(params.sampai);
  const to = afterEnd ? new Date(afterEnd.getTime() + 24 * 60 * 60 * 1000) : null;
  const paidRange = and(from ? gte(payments.paidAt, from) : undefined, to ? lt(payments.paidAt, to) : undefined);
  const createdRange = and(from ? gte(orders.createdAt, from) : undefined, to ? lt(orders.createdAt, to) : undefined);
  const date =
    from || to
      ? or(
          and(eq(orders.source, "online"), inArray(orders.id, db.select({ id: payments.orderId }).from(payments).where(paidRange))),
          and(ne(orders.source, "online"), createdRange),
        )
      : undefined;

  const base = and(search, source ? eq(orders.source, source) : undefined, params.tanpaBatal === "1" ? ne(orders.status, "dibatalkan") : undefined, date);
  return { status, query, source, base, where: and(status ? eq(orders.status, status) : undefined, base) };
}