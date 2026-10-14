"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, TrashIcon } from "@phosphor-icons/react";
import Image from "@/components/site-image";
import type { ProductFormState } from "@/lib/product-actions";

type Option = { slug: string; title: string };
type ExistingImage = { id: number; src: string; alt: string };
export type ProductFormValues = {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  price: number | null;
  stock: number | null;
  published: boolean;
  images: ExistingImage[];
};

const field = "min-h-12 w-full rounded-md border border-line bg-page px-3.5 text-base focus:border-accent focus:outline-none";
const label = "mb-2 block text-sm font-medium";

export function ProductForm({
  action,
  categories,
  product,
  onDelete,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  categories: Option[];
  product?: ProductFormValues;
  onDelete?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [images, setImages] = useState(product?.images ?? []);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);
  useEffect(() => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)), [previews]);

  const move = (index: number, delta: number) => {
    const next = [...images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setImages(next);
  };

  return (
    <>
      <form action={formAction} className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className={label}>Nama produk</label>
            <input id="name" name="name" required defaultValue={product?.name} className={field} />
          </div>
          <div>
            <label htmlFor="slug" className={label}>
              Permalink <span className="font-normal text-muted">(opsional)</span>
            </label>
            <div className="flex min-h-12 items-center rounded-md border border-line bg-page focus-within:border-accent">
              <span className="pl-3.5 text-muted">/produk/</span>
              <input
                id="slug"
                name="slug"
                defaultValue={product?.slug}
                placeholder="dibuat otomatis dari nama"
                aria-describedby="slug-help"
                className="min-h-12 min-w-0 flex-1 bg-transparent pr-3.5 text-base focus:outline-none"
              />
            </div>
            <p id="slug-help" className="mt-2 text-sm text-muted">
              {product
                ? "Mengubah permalink membuat tautan lama yang sudah dibagikan tidak berlaku."
                : "Huruf kecil, angka, dan tanda hubung. Kosongkan agar dibuat dari nama produk."}
            </p>
          </div>
          <div>
            <label htmlFor="description" className={label}>
              Deskripsi <span className="font-normal text-muted">(opsional)</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={product?.description}
              className={`${field} py-3`}
            />
          </div>
          <fieldset>
            <legend className={label}>Foto</legend>
            <p className="-mt-1 mb-4 text-sm text-muted">
              Foto pertama menjadi foto utama. Teks foto dibacakan pembaca layar, jadi jelaskan isi fotonya.
            </p>
            {images.length > 0 && (
              <ul className="mb-4 space-y-3">
                {images.map((image, index) => (
                  <li key={image.id} className="flex items-center gap-3 rounded-md border border-line p-2.5">
                    <input type="hidden" name="imageId" value={image.id} />
                    <div className="photo size-16 shrink-0">
                      <Image src={image.src} alt="" fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`alt-${image.id}`} className="sr-only">Teks foto {index + 1}</label>
                      <input
                        id={`alt-${image.id}`}
                        name={`alt-${image.id}`}
                        defaultValue={image.alt}
                        className={`${field} min-h-10 text-[15px]`}
                      />
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button type="button" className="square size-9" aria-label={`Naikkan foto ${index + 1}`}
                        disabled={index === 0} onClick={() => move(index, -1)}>
                        <ArrowUpIcon size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="square size-9" aria-label={`Turunkan foto ${index + 1}`}
                        disabled={index === images.length - 1} onClick={() => move(index, 1)}>
                        <ArrowDownIcon size={16} aria-hidden="true" />
                      </button>
                      <button type="button" className="square size-9 text-muted" aria-label={`Hapus foto ${index + 1}`}
                        onClick={() => setImages(images.filter((item) => item.id !== image.id))}>
                        <TrashIcon size={16} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <label
              htmlFor="newImages"
              className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-line px-4 py-7 text-center transition-colors hover:border-accent"
            >
              <ImageIcon size={24} className="text-muted" aria-hidden="true" />
              <span className="text-[15px]">Tambah foto</span>
              <span className="text-xs text-muted">JPG, PNG, atau WebP. Maksimal 5 MB per foto.</span>
            </label>
            <input
              id="newImages"
              name="newImages"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={(event) =>
                setPreviews(
                  [...(event.target.files ?? [])].map((file) => ({ url: URL.createObjectURL(file), name: file.name })),
                )
              }
            />
            {previews.length > 0 && (
              <div className="mt-3">
                <p className="mb-2 text-sm text-muted">{previews.length} foto baru akan diunggah:</p>
                <div className="flex flex-wrap gap-2">
                  {previews.map((preview) => (
                    <div key={preview.url} className="photo size-16" title={preview.name}>
                      <Image src={preview.url} alt={preview.name} fill unoptimized className="object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </fieldset>
        </div>
        <div className="space-y-6 lg:sticky lg:top-8 lg:self-start">
          <div>
            <label htmlFor="categorySlug" className={label}>Koleksi</label>
            <select id="categorySlug" name="categorySlug" required defaultValue={product?.categorySlug ?? ""} className={field}>
              <option value="" disabled>Pilih koleksi</option>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>{category.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="price" className={label}>
              Harga <span className="font-normal text-muted">(opsional)</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">Rp</span>
              <input id="price" name="price" inputMode="numeric" placeholder="Kosongkan bila lewat konsultasi"
                defaultValue={product?.price ?? ""} className={`${field} pl-11`} />
            </div>
          </div>
          <div>
            <label htmlFor="stock" className={label}>
              Stok <span className="font-normal text-muted">(opsional)</span>
            </label>
            <input id="stock" name="stock" inputMode="numeric" defaultValue={product?.stock ?? ""} className={field} />
          </div>
          <label className="flex items-start gap-3 rounded-md border border-line p-4">
            <input type="checkbox" name="published" defaultChecked={product?.published ?? true}
              className="mt-1 size-4 accent-[var(--accent)]" />
            <span>
              <span className="block text-[15px] font-medium">Tampilkan di website</span>
              <span className="text-sm text-muted">Foto produk muncul di galeri koleksi.</span>
            </span>
          </label>
          {state.error && <p role="alert" className="text-sm text-ink">{state.error}</p>}
          <div className="flex items-center gap-5">
            <button className="btn min-h-12 flex-1" disabled={pending}>
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <Link href="/admin/produk" className="text-[15px] text-muted hover:text-ink">Batal</Link>
          </div>
        </div>
      </form>
      {onDelete && (
        <form
          action={onDelete}
          className="mt-14 max-w-5xl border-t border-line pt-6"
          onSubmit={(event) => {
            if (!confirm(`Hapus produk "${product?.name}"? Tindakan ini tidak bisa dibatalkan.`)) event.preventDefault();
          }}
        >
          <button className="flex items-center gap-2 text-[15px] text-muted hover:text-ink">
            <TrashIcon size={18} aria-hidden="true" /> Hapus produk
          </button>
        </form>
      )}
    </>
  );
}
