"use client";

import { useActionState, useState, useTransition } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { historicalHeaders, historicalTemplate, maxHistoricalCsvBytes } from "@/lib/historical-csv";
import { importHistoricalCsv, previewHistoricalCsv, undoHistoricalImport } from "@/lib/historical-import-actions";

type Preview = Awaited<ReturnType<typeof previewHistoricalCsv>>;

export function HistoricalImportForm() {
  const [csv, setCsv] = useState("");
  const [preview, setPreview] = useState<Preview>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <section aria-labelledby="upload-csv" className="mt-8">
      <h2 id="upload-csv" className="text-xl">Upload transaksi lama</h2>
      <p className="mt-2 text-sm text-muted">
        Gunakan tanggal DD/MM/YYYY atau YYYY-MM-DD dan angka rupiah tanpa titik/koma. Qty wajib lebih dari 0.
        Metode bayar: tunai, transfer, qris, lainnya, atau doku. Nama pembeli dan nomor nota wajib diisi; HP boleh kosong.
      </p>
      <p className="mt-2 text-sm text-muted">
        Ulangi nomor nota untuk beberapa item. Tanggal, pembeli, HP, ongkir, metode bayar, dan catatan harus sama pada semua
        baris nota tersebut. Ongkir dihitung sekali per nota; kosong berarti 0. Nama produk yang sama persis dengan katalog
        ditautkan ke produk, sisanya disimpan sebagai item bebas.
      </p>
      <a
        download="template-transaksi-historis.csv"
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(historicalTemplate)}`}
        className="mt-4 inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm hover:border-accent"
      >
        Download template CSV
      </a>
      <form className="mt-5 flex flex-wrap items-end gap-3" action={(formData) => {
        startTransition(async () => {
          setError(""); setMessage(""); setPreview(undefined); setCsv("");
          const file = formData.get("csv");
          if (!(file instanceof File) || !file.size) { setError("Pilih file CSV terlebih dahulu."); return; }
          if (file.size > maxHistoricalCsvBytes) { setError("Ukuran CSV maksimal 200 KB."); return; }
          try {
            const text = await file.text();
            const result = await previewHistoricalCsv(text);
            setCsv(text); setPreview(result);
          } catch { setError("Preview gagal dimuat. Coba lagi."); }
        });
      }}>
        <label className="grid gap-2 text-sm">
          File CSV (maksimal 200 KB / 1000 baris)
          <input type="file" name="csv" accept=".csv,text/csv" required disabled={pending}
            className="min-h-11 max-w-full rounded-md border border-line p-2"
            onChange={() => { setPreview(undefined); setCsv(""); setMessage(""); setError(""); }} />
        </label>
        <button className="btn min-h-11 px-4 text-sm" disabled={pending}>{pending ? "Memproses…" : "Lihat preview"}</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      {preview && (
        <div className="mt-6">
          {preview.errors.length > 0 ? (
            <div role="alert" className="rounded-md border border-danger p-4 text-sm text-danger">
              <p>Belum ada data disimpan. Perbaiki baris berikut lalu upload ulang.</p>
              <ul className="mt-2 list-disc pl-5">
                {preview.errors.map((item, i) => <li key={i}>Baris {item.line}: {item.message}</li>)}
              </ul>
            </div>
          ) : <p className="text-sm">{preview.orderCount} transaksi, {preview.rows.length} item. {preview.skipped} nota sudah ada dan akan dilewati.</p>}
          {preview.rows.length > 0 && (
            <div className="mt-4 max-h-[32rem] overflow-auto rounded-md border border-line" tabIndex={0} role="region" aria-label="Preview baris CSV">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface"><tr>
                  {["Baris Excel", ...historicalHeaders, "Produk", "Hasil"].map((header) => <th key={header} scope="col" className="px-3 py-3 whitespace-nowrap">{header}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-line">
                  {preview.rows.map((row) => {
                    const warning = [
                      row.duplicateLines.length > 0
                        ? `Nomor nota sama dengan baris ${row.duplicateLines.join(", ")}. Item pada baris-baris ini digabung menjadi satu transaksi.`
                        : "",
                      row.duplicate ? "Nota sudah tersimpan di database dan akan dilewati." : "",
                    ].filter(Boolean).join(" ");
                    return <tr key={row.line}>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-2">
                        {row.line}
                        {warning && (
                          <span title={warning} aria-label={warning} role="img" tabIndex={0}
                            className="inline-flex cursor-help rounded-sm text-amber-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                            <WarningCircleIcon size={18} weight="fill" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                    </td>
                    {row.values.map((value, i) => <td key={i} className="max-w-xs min-w-24 px-3 py-3 wrap-break-word">{value || "—"}</td>)}
                    <td className="px-3 py-3 whitespace-nowrap">{row.productId ? `Katalog #${row.productId}` : "Item bebas"}</td>
                    <td className={`min-w-48 px-3 py-3 ${row.errors.length ? "text-danger" : ""}`}>
                      {row.errors.length ? row.errors.join(" ") : row.duplicate ? "Dilewati: nota sudah ada" : "Siap diimport"}
                    </td>
                  </tr>;
                  })}
                </tbody>
              </table>
            </div>
          )}
          <button type="button" className="btn mt-4 min-h-11 px-4 text-sm"
            disabled={pending || preview.errors.length > 0 || preview.orderCount === preview.skipped}
            onClick={() => startTransition(async () => {
              setError("");
              try {
                const result = await importHistoricalCsv(csv);
                if (result.errors.length) { setPreview({ ...preview, errors: result.errors }); return; }
                setPreview(undefined); setCsv("");
                setMessage(`${result.inserted} transaksi berhasil diimport. ${result.skipped} nota duplikat dilewati.${result.batchId ? ` Batch: ${result.batchId}.` : ""}`);
              } catch { setError("Hasil import belum dapat dikonfirmasi. Coba lagi; nomor nota yang sudah ada akan dilewati."); }
            })}>
            {pending ? "Memproses…" : `Simpan ${preview.orderCount - preview.skipped} transaksi`}
          </button>
        </div>
      )}
    </section>
  );
}

export function UndoHistoricalImport({ batchId }: { batchId: string }) {
  const [state, action, pending] = useActionState<{ error?: string }>(async () => {
    try { return await undoHistoricalImport(batchId); }
    catch { return { error: "Hasil impor belum bisa dihapus. Coba lagi." }; }
  }, {});
  return (
    <form action={action} onSubmit={(event) => {
      if (!confirm("Hapus semua transaksi dalam batch ini? Stok tidak akan berubah.")) event.preventDefault();
    }}>
      <button className="min-h-11 rounded-md border border-danger px-4 text-sm text-danger" disabled={pending}>
        {pending ? "Menghapus…" : "Hapus"}
      </button>
      {state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
    </form>
  );
}
