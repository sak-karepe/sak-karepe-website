/**
 * Periode laporan penjualan menurut WIB (UTC+7). Semua batas berupa Date; `to` eksklusif (awal hari berikutnya).
 * `prev*` adalah periode pembanding: bulan/tahun sebelumnya sepanjang hari yang sama, atau rentang selanjutnya
 * sepanjang rentang yang dipilih.
 */
export const periodKeys = ["bulan-ini", "bulan-lalu", "tahun-ini", "rentang"] as const;
export type PeriodKey = (typeof periodKeys)[number];
export const periodLabels: Record<PeriodKey, string> = {
  "bulan-ini": "Bulan ini",
  "bulan-lalu": "Bulan lalu",
  "tahun-ini": "Tahun ini",
  rentang: "Rentang bebas",
};

export type Granularity = "day" | "month";
export type Period = {
  key: PeriodKey;
  from: Date;
  to: Date;
  prevFrom: Date;
  prevTo: Date;
  granularity: Granularity;
  /** Tanggal awal dan akhir (inklusif) sebagai YYYY-MM-DD, untuk tautan export dan isian form. */
  fromDay: string;
  toDay: string;
};

const WIB = 7 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
/** Rentang bebas dibatasi agar query dan grafik tetap ringan. */
const maxRangeDays = 366 * 3;

/** Awal hari menurut WIB; bulan/hari yang melewati batas dinormalkan (mis. bulan -1 = Desember tahun lalu). */
const wibDate = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day) - WIB);

/** "2026-11-08" -> Date awal hari WIB; null bila bukan tanggal yang valid. */
export function parseDay(value: string | undefined) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return wibDate(year, month - 1, day);
}

/** Date -> "YYYY-MM-DD" menurut WIB. */
export function formatDay(date: Date) {
  return new Date(date.getTime() + WIB).toISOString().slice(0, 10);
}

export function resolvePeriod(params: { periode?: string; dari?: string; sampai?: string }, now = new Date()): Period {
  const local = new Date(now.getTime() + WIB);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const key = periodKeys.find((value) => value === params.periode) ?? "bulan-ini";
  const earlier = (a: Date, b: Date) => (a.getTime() < b.getTime() ? a : b);

  let from: Date, to: Date, prevFrom: Date, prevTo: Date, granularity: Granularity;
  if (key === "bulan-lalu") {
    from = wibDate(y, m - 1, 1);
    to = wibDate(y, m, 1);
    prevFrom = wibDate(y, m - 2, 1);
    prevTo = from;
    granularity = "day";
  } else if (key === "tahun-ini") {
    from = wibDate(y, 0, 1);
    to = wibDate(y, m, d + 1);
    prevFrom = wibDate(y - 1, 0, 1);
    prevTo = earlier(wibDate(y - 1, m, d + 1), from);
    granularity = "month";
  } else if (key === "rentang") {
    // Tanggal tidak valid atau terbalik jatuh kembali ke bulan berjalan.
    let start = parseDay(params.dari) ?? wibDate(y, m, 1);
    let end = parseDay(params.sampai) ?? wibDate(y, m, d);
    if (end.getTime() < start.getTime()) [start, end] = [end, start];
    if ((end.getTime() - start.getTime()) / DAY > maxRangeDays) start = new Date(end.getTime() - maxRangeDays * DAY);
    from = start;
    to = new Date(end.getTime() + DAY);
    prevFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));
    prevTo = from;
    granularity = (to.getTime() - from.getTime()) / DAY > 62 ? "month" : "day";
  } else {
    from = wibDate(y, m, 1);
    to = wibDate(y, m, d + 1);
    prevFrom = wibDate(y, m - 1, 1);
    prevTo = earlier(wibDate(y, m - 1, d + 1), from);
    granularity = "day";
  }
  return { key, from, to, prevFrom, prevTo, granularity, fromDay: formatDay(from), toDay: formatDay(new Date(to.getTime() - DAY)) };
}

/** Kunci setiap bucket grafik dari `from` sampai sebelum `to`: "YYYY-MM-DD" per hari atau "YYYY-MM" per bulan. */
export function bucketKeys(from: Date, to: Date, granularity: Granularity) {
  const keys: string[] = [];
  if (granularity === "day") {
    for (let t = from.getTime(); t < to.getTime(); t += DAY) keys.push(formatDay(new Date(t)));
    return keys;
  }
  const start = new Date(from.getTime() + WIB);
  const end = new Date(to.getTime() - 1 + WIB);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();
  while (year < end.getUTCFullYear() || (year === end.getUTCFullYear() && month <= end.getUTCMonth())) {
    keys.push(`${year}-${String(month + 1).padStart(2, "0")}`);
    if (++month > 11) [year, month] = [year + 1, 0];
  }
  return keys;
}

/** Persentase perubahan; null bila pembandingnya 0 (tidak bisa dibagi). */
export const percentChange = (current: number, previous: number) => (previous === 0 ? null : ((current - previous) / previous) * 100);