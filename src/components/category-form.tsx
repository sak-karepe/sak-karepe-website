"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { ImageIcon, TrashIcon } from "@phosphor-icons/react";
import Image from "@/components/site-image";
import type { CategoryFormState } from "@/lib/category-actions";
import { sanitizeSlugInput } from "@/lib/format";

export type CategoryFormValues = {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  intro: string;
  character: string;
  coverImage: string;
  sortOrder: number;
};

const field = "min-h-12 w-full rounded-md border border-line bg-page px-3.5 text-base focus:border-accent focus:outline-none";
const label = "mb-2 block text-sm font-medium";

export function CategoryForm({
  action,
  category,
  defaultSortOrder = 0,
  productCount = 0,
  onDelete,
}: {
  action: (state: CategoryFormState, formData: FormData) => Promise<CategoryFormState>;
  category?: CategoryFormValues;
  defaultSortOrder?: number;
  productCount?: number;
  onDelete?: () => Promise<CategoryFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [deleteState, deleteAction, deleting] = useActionState<CategoryFormState>(onDelete ?? (async () => ({})), {});
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url);
    },
    [preview],
  );

  const canDelete = productCount === 0;

  return (
    <>
      <form
        action={formAction}
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
        className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px]"
      >
        <div className="space-y-6">
          <div>
            <label htmlFor="title" className={label}>
              Judul koleksi
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={category?.title}
              placeholder="Mis. Busana, Tas, Kain"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="slug" className={label}>
              Permalink <span className="font-normal text-muted">(opsional)</span>
            </label>
            <input
              id="slug"
              name="slug"
              defaultValue={category?.slug}
              placeholder="dibuat otomatis dari judul"
              aria-describedby="slug-help"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => {
                event.currentTarget.value = sanitizeSlugInput(event.currentTarget.value);
              }}
              onBlur={(event) => {
                event.currentTarget.value = event.currentTarget.value.replace(/-+$/g, "");
              }}
              className={field}
            />
            <p id="slug-help" className="mt-2 text-sm text-muted">
              {category
                ? "Mengubah permalink akan otomatis memperbarui seluruh produk di koleksi ini."
                : "Huruf kecil, angka, dan tanda hubung. Kosongkan agar dibuat dari judul koleksi."}
            </p>
          </div>

          <div>
            <label htmlFor="subtitle" className={label}>
              Subjudul
            </label>
            <input
              id="subtitle"
              name="subtitle"
              required
              defaultValue={category?.subtitle}
              placeholder="Mis. Ecoprint bertemu batik"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="intro" className={label}>
              Kalimat pembuka (intro)
            </label>
            <input
              id="intro"
              name="intro"
              required
              defaultValue={category?.intro}
              placeholder="Mis. Ecoprint bertemu batik dan tenun."
              className={field}
            />
            <p className="mt-1.5 text-sm text-muted">
              Ditampilkan sebagai kalimat utama di bagian atas halaman koleksi.
            </p>
          </div>

          <div>
            <label htmlFor="character" className={label}>
              Karakter koleksi
            </label>
            <textarea
              id="character"
              name="character"
              required
              rows={4}
              defaultValue={category?.character}
              placeholder="Ceritakan bahan, motif, atau keunikan koleksi ini..."
              className={`${field} py-3`}
            />
            <p className="mt-1.5 text-sm text-muted">
              Paragraf penjelasan di bawah kalimat pembuka pada halaman koleksi.
            </p>
          </div>

          <div>
            <label htmlFor="description" className={label}>
              Deskripsi &amp; teks foto sampul
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              defaultValue={category?.description}
              placeholder="Ringkasan koleksi untuk mesin pencari dan keterangan foto sampul..."
              className={`${field} py-3`}
            />
            <p className="mt-1.5 text-sm text-muted">
              Dipakai sebagai deskripsi halaman (SEO) dan teks alternatif foto sampul.
            </p>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div>
            <span className={label}>Foto cover</span>
            <p className="-mt-1 mb-3 text-sm text-muted">
              Ditampilkan pada kartu koleksi di halaman etalase.
            </p>
            {(preview || category?.coverImage) && (
              <div className="mb-3 overflow-hidden rounded-md border border-line bg-surface">
                <div className="photo aspect-4/5 w-full">
                  <Image
                    src={preview ? preview.url : category!.coverImage}
                    alt={preview ? preview.name : category!.title}
                    fill
                    unoptimized={Boolean(preview)}
                    sizes="340px"
                    className="object-cover"
                  />
                </div>
                {preview && (
                  <p className="truncate px-3 py-2 text-xs text-muted">
                    Foto baru: {preview.name}
                  </p>
                )}
              </div>
            )}
            <label
              htmlFor="coverImage"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-line px-4 py-6 text-center transition-colors hover:border-accent"
            >
              <ImageIcon size={24} className="text-muted" aria-hidden="true" />
              <span className="text-[15px]">
                {category?.coverImage || preview ? "Ganti foto cover" : "Pilih foto cover"}
              </span>
              <span className="text-xs text-muted">JPG, PNG, atau WebP. Maksimal 5 MB.</span>
            </label>
            <input
              id="coverImage"
              name="coverImage"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!category}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setPreview(file ? { url: URL.createObjectURL(file), name: file.name } : null);
              }}
            />
          </div>

          <div>
            <label htmlFor="sortOrder" className={label}>
              Urutan tampil
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              inputMode="numeric"
              defaultValue={category?.sortOrder ?? defaultSortOrder}
              className={`${field} tabular-nums`}
            />
            <p className="mt-1.5 text-sm text-muted">
              Angka lebih kecil tampil lebih dulu di etalase dan filter produk.
            </p>
          </div>

          {state.error && (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          )}

          <div className="flex items-center gap-5">
            <button className="btn min-h-12 flex-1" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <Link href="/admin/koleksi" className="text-[15px] text-muted hover:text-ink">
              Batal
            </Link>
          </div>
        </div>
      </form>

      {onDelete && category && (
        <form
          action={deleteAction}
          className="mt-20 max-w-5xl border-t border-line pt-8"
          onSubmit={(event) => {
            if (!canDelete) {
              event.preventDefault();
              return;
            }
            if (!confirm(`Hapus koleksi "${category.title}"? Tindakan ini tidak bisa dibatalkan.`)) {
              event.preventDefault();
            }
          }}
        >
          <button
            disabled={!canDelete || deleting}
            className="flex items-center gap-2 text-[15px] text-danger transition-opacity hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline disabled:opacity-60"
          >
            <TrashIcon size={18} aria-hidden="true" />{" "}
            {deleting ? "Menghapus…" : "Hapus koleksi"}
          </button>
          {!canDelete && (
            <p className="mt-2 text-sm text-muted">
              Koleksi ini berisi {productCount} produk dan tidak bisa dihapus.{" "}
              <Link
                href={`/admin/produk?koleksi=${encodeURIComponent(category.slug)}`}
                className="text-accent hover:underline"
              >
                Lihat produk di koleksi ini
              </Link>{" "}
              untuk memindahkan atau menghapus produknya terlebih dahulu.
            </p>
          )}
          {deleteState.error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {deleteState.error}
            </p>
          )}
        </form>
      )}
    </>
  );
}

