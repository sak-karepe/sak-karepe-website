import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { expenseCategories, expenses } from "@/db/schema";
import { ExpenseForm } from "@/components/expense-form";
import { deleteExpense } from "@/lib/expense-actions";
import { expenseCategoryLabels } from "@/lib/expenses";
import { formatRupiah } from "@/lib/format";
import { exec } from "@/lib/report";
import { formatDay, periodKeys, periodLabels, resolvePeriod } from "@/lib/report-period";
import { expenseSourceSql } from "@/lib/report-sql";

export const metadata: Metadata = { title: "Pengeluaran" };

type Params = { periode?: string; dari?: string; sampai?: string; kategori?: string; edit?: string };
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Params> }) {
  await requireAdminPage();
  const params = await searchParams;
  const period = resolvePeriod(params);
  const category = expenseCategories.find((value) => value === params.kategori);

  const href = (patch: Partial<Params>) => {
    const merged: Params = {
      periode: period.key,
      ...(period.key === "rentang" && { dari: period.fromDay, sampai: period.toDay }),
      ...(category && { kategori: category }),
      ...patch,
    };
    const query = new URLSearchParams(Object.entries(merged).filter((entry): entry is [string, string] => Boolean(entry[1])));
    return `/admin/keuangan/pengeluaran?${query}`;
  };
  const back = href({});

  // Catatan admin + ongkir kirim ulang otomatis, dengan aturan yang sama seperti laporan laba/rugi.
  const rows = await exec({
    text: `SELECT x.id, x.at, x.category, x.amount, x.note, x.order_id, x.auto, o.code FROM (${expenseSourceSql}) x
LEFT JOIN orders o ON o.id = x.order_id
WHERE x.at >= ? AND x.at < ?${category ? " AND x.category = ?" : ""}
ORDER BY x.at DESC, x.id DESC LIMIT 500`,
    params: [seconds(period.from), seconds(period.to), ...(category ? [category] : [])],
  });
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);

  const editId = Number(params.edit) || undefined;
  const editing = editId
    ? await db.query.expenses.findFirst({ where: eq(expenses.id, editId), with: { order: { columns: { code: true } } } })
    : undefined;

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Pengeluaran</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Dipakai untuk laba/rugi di <Link href="/admin/laporan" className="text-accent underline">Laporan</Link>. Ongkir kirim ulang
        yang ditanggung toko sudah tercatat otomatis, jangan dicatat lagi.
      </p>

      <section aria-label={editing ? "Ubah pengeluaran" : "Catat pengeluaran"} className="mt-8 max-w-3xl">
        <h2 className="mb-3 text-xl tracking-[-.03em]">{editing ? "Ubah pengeluaran" : "Catat pengeluaran"}</h2>
        <ExpenseForm
          key={editing?.id ?? "baru"}
          back={back}
          values={
            editing
              ? {
                  id: editing.id,
                  date: formatDay(editing.spentAt),
                  category: editing.category,
                  amount: editing.amount,
                  note: editing.note ?? "",
                  orderCode: editing.order?.code ?? "",
                }
              : { date: formatDay(new Date()), category: "", amount: null, note: "", orderCode: "" }
          }
        />
      </section>

      <nav aria-label="Periode" className="mt-10 flex gap-6 overflow-x-auto border-b border-line">
        {periodKeys.map((key) => (
          <Link
            key={key}
            href={href({ periode: key, dari: key === "rentang" ? period.fromDay : undefined, sampai: key === "rentang" ? period.toDay : undefined })}
            aria-current={period.key === key ? "page" : undefined}
            className={`shrink-0 border-b-2 px-1 py-3 text-[15px] ${period.key === key ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"}`}
          >
            {periodLabels[key]}
          </Link>
        ))}
      </nav>
      {period.key === "rentang" && (
        <form action="/admin/keuangan/pengeluaran" className="mt-5 flex flex-wrap items-end gap-3">
          <input type="hidden" name="periode" value="rentang" />
          {category && <input type="hidden" name="kategori" value={category} />}
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
      <nav aria-label="Kategori" className="mt-4 flex flex-wrap gap-2">
        {[undefined, ...expenseCategories].map((value) => (
          <Link
            key={value ?? "semua"}
            href={href({ kategori: value })}
            aria-current={category === value ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${category === value ? "border-accent bg-surface font-medium" : "border-line text-muted hover:text-ink"}`}
          >
            {value ? expenseCategoryLabels[value] : "Semua kategori"}
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-[15px] text-muted">
        {period.fromDay} sampai {period.toDay}: <strong className="font-medium text-ink tabular-nums">{formatRupiah(total)}</strong> dari {rows.length} catatan.
      </p>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-line py-10 text-center text-muted">Belum ada pengeluaran pada periode ini.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {rows.map((row) => {
            const id = Number(row.id);
            const auto = Number(row.auto) === 1;
            return (
              <li key={`${auto ? "a" : "m"}${id}`} className="flex flex-wrap items-center gap-x-5 gap-y-1 py-3.5">
                <span className="w-24 shrink-0 text-sm text-muted tabular-nums">{formatDay(new Date(Number(row.at) * 1000))}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px]">{expenseCategoryLabels[row.category as keyof typeof expenseCategoryLabels] ?? String(row.category)}</span>
                  <span className="block text-sm text-muted">
                    {row.note ? String(row.note) : null}
                    {row.code ? (
                      <>
                        {row.note ? " · " : ""}
                        <Link href={`/admin/pesanan/${row.order_id}`} className="font-mono hover:text-accent">{String(row.code)}</Link>
                      </>
                    ) : null}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums">{formatRupiah(Number(row.amount))}</span>
                {auto ? (
                  <span className="w-20 shrink-0 text-right text-xs text-muted">Otomatis</span>
                ) : (
                  <span className="flex w-20 shrink-0 justify-end">
                    <Link href={href({ edit: String(id) })} className="square size-9" aria-label={`Ubah pengeluaran ${formatDay(new Date(Number(row.at) * 1000))}`}>
                      <PencilSimpleIcon size={16} aria-hidden="true" />
                    </Link>
                    <form action={deleteExpense.bind(null, id)}>
                      <button className="square size-9 text-muted hover:text-danger" aria-label={`Hapus pengeluaran ${formatDay(new Date(Number(row.at) * 1000))}`}>
                        <TrashIcon size={16} aria-hidden="true" />
                      </button>
                    </form>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
