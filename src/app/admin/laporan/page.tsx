import type { Metadata } from "next";
import Link from "next/link";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { RevenueChart } from "@/components/revenue-chart";
import { expenseCategoryLabels } from "@/lib/expenses";
import { formatRupiah } from "@/lib/format";
import { getReport, lowStockThreshold, type Row } from "@/lib/report";
import { percentChange, periodKeys, periodLabels, resolvePeriod, type PeriodKey } from "@/lib/report-period";
import { sources, type Source } from "@/lib/report-sql";
export const metadata: Metadata = { title: "Laporan" };

const sourceLabels: Record<Source, string> = { online: "Online", langsung: "Langsung", historis: "Historis" };
const methodLabels: Record<string, string> = {
  doku: "DOKU",
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
  lainnya: "Lainnya",
  "tidak-tercatat": "Tidak tercatat",
};
const number = new Intl.NumberFormat("id-ID");
const percent = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

type Params = { periode?: string; dari?: string; sampai?: string; sumber?: string };

export default async function AdminReportPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminPage();
  const params = await searchParams;
  const period = resolvePeriod(params);
  const source = sources.find((value) => value === params.sumber);
  const report = await getReport(period, source);
  const { totals, previous } = report;

  /** Tautan dengan pengaturan sekarang, ditimpa `patch` (nilai undefined dibuang). */
  const href = (patch: Partial<Record<keyof Params, string>>) => {
    const merged: Params = { periode: period.key, ...(period.key === "rentang" && { dari: period.fromDay, sampai: period.toDay }), ...(source && { sumber: source }), ...patch };
    const query = new URLSearchParams(Object.entries(merged).filter((entry): entry is [string, string] => Boolean(entry[1])));
    return `/admin/laporan?${query}`;
  };
  const periodHref = (key: PeriodKey) => href({ periode: key, dari: key === "rentang" ? period.fromDay : undefined, sampai: key === "rentang" ? period.toDay : undefined });
  // Export membawa periode, sumber, dan "tanpa dibatalkan" yang sama dengan aturan laporan, jadi total Subtotal export = omzet.
  const exportHref = `/admin/pesanan/export?${new URLSearchParams({ dari: period.fromDay, sampai: period.toDay, tanpaBatal: "1", ...(source && { sumber: source }) })}`;

  const change = percentChange(totals.net, previous.net);
  const cards: { label: string; value: string; hint?: string; tone?: "up" | "down" }[] = [
    { label: "Omzet", value: formatRupiah(totals.gross), hint: "Tanpa ongkir, sebelum dikurangi refund" },
    { label: "Refund", value: `${number.format(totals.refundCount)} pesanan`, hint: `Senilai ${formatRupiah(totals.refundValue)}` },
    {
      label: "Omzet bersih",
      value: formatRupiah(totals.net),
      hint: change === null ? "Belum ada pembanding" : `${change >= 0 ? "▲" : "▼"} ${percent.format(Math.abs(change))}% dari periode sebelumnya (${formatRupiah(previous.net)})`,
      tone: change === null ? undefined : change >= 0 ? "up" : "down",
    },
    { label: "Ongkir terkumpul", value: formatRupiah(totals.shipping), hint: "Tidak termasuk pesanan yang di-refund" },
    { label: "Jumlah transaksi", value: number.format(totals.transactions), hint: "Tidak termasuk refund" },
    { label: "Rata-rata nilai transaksi", value: formatRupiah(totals.average), hint: "Omzet bersih dibagi jumlah transaksi" },
  ];

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Laporan</h1>
          <p className="mt-2 text-muted">
            {periodLabels[period.key]}, {period.fromDay} sampai {period.toDay}
            {source && `, sumber ${sourceLabels[source].toLowerCase()}`}.
          </p>
        </div>
        {/* <a>, bukan <Link>: tujuannya route handler yang mengunduh file, jangan di-prefetch. */}
        <a href={exportHref} download className="btn btn-outline min-h-11 gap-2 px-4 text-[15px]">
          <DownloadSimpleIcon size={18} aria-hidden="true" /> Export Excel periode ini
        </a>
      </div>

      <nav aria-label="Periode" className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
        {periodKeys.map((key) => (
          <Link
            key={key}
            href={periodHref(key)}
            aria-current={period.key === key ? "page" : undefined}
            className={`shrink-0 border-b-2 px-1 py-3 text-[15px] ${period.key === key ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"}`}
          >
            {periodLabels[key]}
          </Link>
        ))}
      </nav>
      {period.key === "rentang" && (
        <form action="/admin/laporan" className="mt-5 flex flex-wrap items-end gap-3">
          <input type="hidden" name="periode" value="rentang" />
          {source && <input type="hidden" name="sumber" value={source} />}
          <label className="text-sm text-muted">
            <span className="mb-1.5 block">Dari</span>
            <input type="date" name="dari" defaultValue={period.fromDay} className="min-h-11 rounded-md border border-line bg-page px-3 text-[15px] text-ink focus:border-accent focus:outline-none" />
          </label>
          <label className="text-sm text-muted">
            <span className="mb-1.5 block">Sampai</span>
            <input type="date" name="sampai" defaultValue={period.toDay} className="min-h-11 rounded-md border border-line bg-page px-3 text-[15px] text-ink focus:border-accent focus:outline-none" />
          </label>
          <button className="btn min-h-11 px-4 text-[15px]">Terapkan</button>
        </form>
      )}
      <nav aria-label="Sumber transaksi" className="mt-4 flex flex-wrap gap-2">
        {[undefined, ...sources].map((value) => (
          <Link
            key={value ?? "semua"}
            href={href({ sumber: value })}
            aria-current={source === value ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${source === value ? "border-accent bg-surface font-medium" : "border-line text-muted hover:text-ink"}`}
          >
            {value ? sourceLabels[value] : "Semua sumber"}
          </Link>
        ))}
      </nav>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <li key={card.label} className="rounded-2xl border border-line p-5">
            <p className="text-[15px] text-muted">{card.label}</p>
            <p className="mt-2 text-2xl tabular-nums tracking-[-.03em] md:text-3xl">{card.value}</p>
            {card.hint && <p className={`mt-1.5 text-sm ${card.tone === "up" ? "text-accent" : card.tone === "down" ? "text-danger" : "text-muted"}`}>{card.hint}</p>}
          </li>
        ))}
      </ul>

      <Section title="Laba/rugi" note={source ? "Pengeluaran tidak dipisah per sumber, jadi laba hanya untuk semua sumber" : undefined}>
        {source ? (
          <p className="py-4 text-muted">
            <Link href={href({ sumber: undefined })} className="text-accent underline">Lihat semua sumber</Link> untuk menghitung laba.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <dl className="space-y-2 text-[15px]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Omzet bersih</dt>
                <dd className="tabular-nums">{formatRupiah(totals.net)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Pengeluaran</dt>
                <dd className="tabular-nums">- {formatRupiah(report.profit.expenseTotal)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line pt-2 text-lg font-medium">
                <dt>{report.profit.profit < 0 ? "Rugi" : "Laba"}</dt>
                <dd className={`tabular-nums ${report.profit.profit < 0 ? "text-danger" : ""}`}>{formatRupiah(Math.abs(report.profit.profit))}</dd>
              </div>
            </dl>
            <div>
              {report.profit.expenses.length === 0 ? (
                <p className="text-muted">Belum ada pengeluaran tercatat pada periode ini.</p>
              ) : (
                <ul className="space-y-1.5 text-[15px]">
                  {report.profit.expenses.map((row) => (
                    <li key={row.category} className="flex justify-between gap-4">
                      <span className="text-muted">{expenseCategoryLabels[row.category as keyof typeof expenseCategoryLabels] ?? row.category}</span>
                      <span className="tabular-nums">{formatRupiah(row.value)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/admin/keuangan/pengeluaran?${new URLSearchParams({ periode: "rentang", dari: period.fromDay, sampai: period.toDay })}`}
                className="mt-3 inline-block text-sm text-accent underline"
              >
                Catat atau lihat pengeluaran
              </Link>
            </div>
          </div>
        )}
      </Section>

      <Section title="Tren omzet bersih" note={period.granularity === "day" ? "Per hari" : "Per bulan"}>
        {totals.transactions + totals.refundCount === 0 && previous.transactions === 0 ? (
          <Empty />
        ) : (
          <RevenueChart {...report.chart} />
        )}
      </Section>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Section title="Per sumber" compact>
          <BarList rows={report.bySource.map((row) => ({ ...row, name: sourceLabels[row.name as Source] ?? row.name }))} />
        </Section>
        <Section title="Per metode bayar" compact>
          <BarList rows={report.byMethod.map((row) => ({ ...row, name: methodLabels[row.name] ?? row.name }))} />
        </Section>
        <Section title="Per koleksi" compact>
          <BarList rows={report.byCollection} showQuantity />
        </Section>
      </div>

      <div className="mt-10 grid gap-6 xl:grid-cols-2">
        <Section title="Produk terlaris" compact>
          <Table
            head={["Produk", "Terjual", "Nilai"]}
            rows={report.products.map((row) => [row.name, number.format(row.quantity ?? 0), formatRupiah(row.value)])}
          />
        </Section>
        <Section title="Pembeli teratas" compact>
          <Table
            head={["Pembeli", "Transaksi", "Nilai"]}
            rows={report.buyers.map((row) => [row.email && row.email !== row.name ? `${row.name} (${row.email})` : row.name, number.format(row.transactions ?? 0), formatRupiah(row.value)])}
          />
        </Section>
      </div>

      <Section title="Stok" note={`Menipis = sisa ${lowStockThreshold} atau kurang. Produk dengan stok tak terbatas tidak ikut.`}>
        {report.stock.out.length + report.stock.low.length === 0 ? (
          <p className="py-6 text-muted">Semua produk stoknya aman.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <StockList title="Habis" items={report.stock.out} tone="danger" />
            <StockList title="Menipis" items={report.stock.low} />
          </div>
        )}
      </Section>

      <section aria-labelledby="aturan" className="mt-12 rounded-2xl bg-surface p-6">
        <h2 id="aturan" className="text-xl tracking-[-.03em]">
          Aturan hitung
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-muted">
          <li>
            <strong className="font-medium text-ink">Transaksi:</strong> semua pesanan selain yang dibatalkan. Pesanan online dihitung pada <strong className="font-medium text-ink">tanggal bayar</strong>{" "}
            (yang belum dibayar belum ikut). Penjualan langsung dan data historis dihitung pada <strong className="font-medium text-ink">tanggal transaksi</strong> yang dicatat.
          </li>
          <li>Omzet = jumlah harga produk, tanpa ongkir. Pesanan berstatus refund tetap ada di omzet lalu dikurangkan: omzet bersih = omzet - nilai refund.</li>
          <li>Jumlah transaksi, rata-rata, ongkir terkumpul, dan semua rincian tidak menghitung pesanan refund.</li>
          <li>Pesanan yang paketnya gagal kirim atau diretur tetap dihitung sampai statusnya menjadi refund.</li>
          <li>Hari dan bulan memakai zona waktu WIB. Pembanding = periode sebelumnya dengan panjang yang sama.</li>
          <li>Omzet di halaman ini sama dengan jumlah kolom Subtotal pada file Export Excel periode ini.</li>
          <li>
            Laba = omzet bersih - pengeluaran pada tanggal yang sama. Pengeluaran = catatan di halaman Pengeluaran ditambah ongkir kirim ulang yang
            ditanggung toko (otomatis, sebesar ongkir awal pesanan). Modal per produk belum dihitung otomatis; catat sebagai pengeluaran modal/bahan.
          </li>
        </ul>
      </section>
    </main>
  );
}

function Section({ title, note, compact, children }: { title: string; note?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <section className={compact ? "rounded-2xl border border-line p-5" : "mt-10"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 className="text-xl tracking-[-.03em]">{title}</h2>
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      <div className={compact ? "mt-4" : "mt-4 rounded-2xl border border-line p-5"}>{children}</div>
    </section>
  );
}

const Empty = () => <p className="py-8 text-center text-muted">Belum ada transaksi pada periode ini.</p>;

/** Daftar dengan batang proporsional terhadap nilai terbesar. */
function BarList({ rows, showQuantity }: { rows: Row[]; showQuantity?: boolean }) {
  if (!rows.length) return <Empty />;
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <li key={row.name}>
          <div className="flex items-baseline justify-between gap-3 text-[15px]">
            <span className="min-w-0 truncate">{row.name}</span>
            <span className="shrink-0 tabular-nums">{formatRupiah(row.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full" style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 2 : 0)}%`, background: "var(--accent)" }} />
          </div>
          <p className="mt-1 text-xs text-muted">
            {showQuantity ? `${number.format(row.quantity ?? 0)} item` : `${number.format(row.transactions ?? 0)} transaksi`}
          </p>
        </li>
      ))}
    </ul>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (!rows.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[15px]">
        <thead>
          <tr className="border-b border-line text-sm text-muted">
            {head.map((label, index) => (
              <th key={label} className={`py-2 font-normal ${index === 0 ? "" : "pl-4 text-right"}`}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((value, index) => (
                <td key={index} className={`py-2.5 ${index === 0 ? "min-w-0 max-w-[260px] truncate pr-2" : "pl-4 text-right tabular-nums"}`}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StockList({ title, items, tone }: { title: string; items: { id: number; name: string; stock: number }[]; tone?: "danger" }) {
  return (
    <div>
      <h3 className={`text-[15px] font-medium ${tone === "danger" ? "text-danger" : ""}`}>
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Tidak ada.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/admin/produk/${item.id}`} className="flex items-center justify-between gap-3 py-2.5 text-[15px] hover:text-accent">
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 tabular-nums text-muted">{item.stock === 0 ? "Habis" : `Sisa ${item.stock}`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}