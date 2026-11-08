import type { Metadata } from "next";
import { and, count, desc, eq, isNotNull, max } from "drizzle-orm";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { AdminBack } from "@/components/admin-back";
import { HistoricalImportForm, UndoHistoricalImport } from "@/components/historical-import-form";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Import transaksi lama" };

export default async function HistoricalImportPage() {
  await requireAdminPage();
  const batches = await db.select({ id: orders.importBatchId, total: count(), importedAt: max(orders.updatedAt) })
    .from(orders).where(and(eq(orders.source, "historis"), isNotNull(orders.importBatchId)))
    .groupBy(orders.importBatchId).orderBy(desc(max(orders.id)));
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack href="/admin/pesanan" label="Semua pesanan" />
      <h1 className="mt-4 text-3xl tracking-[-.045em] md:text-4xl">Import transaksi lama</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Masukkan riwayat penjualan dari buku atau Excel. Semua transaksi disimpan sebagai selesai pada tanggal di CSV.
        Import dan pembatalannya tidak mengubah stok.
      </p>
      <HistoricalImportForm />
      <section aria-labelledby="batch-import" className="mt-12">
        <h2 id="batch-import" className="text-xl">Riwayat batch import</h2>
        <p className="mt-2 text-sm text-muted">Batalkan satu batch bila salah, lalu upload file yang sudah diperbaiki. Nota duplikat yang dilewati tetap tersimpan dalam batch asalnya.</p>
        {batches.length === 0 ? <p className="mt-4 text-sm text-muted">Belum ada batch import.</p> : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {batches.map((batch) => <li key={batch.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="min-w-0">
                <p className="font-mono text-sm break-all">{batch.id}</p>
                <p className="mt-1 text-sm text-muted">{batch.total} transaksi · {batch.importedAt && formatDateTime(batch.importedAt)}</p>
              </div>
              <UndoHistoricalImport batchId={batch.id!} />
            </li>)}
          </ul>
        )}
      </section>
    </main>
  );
}
