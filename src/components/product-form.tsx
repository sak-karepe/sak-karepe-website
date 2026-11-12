"use client";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, ImageIcon, TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import Image from "@/components/site-image";
import { SearchableSelect, type SearchOption } from "@/components/searchable-select";
import { sanitizeSlugInput } from "@/lib/format";
import { searchCategories, type ProductFormState } from "@/lib/product-actions";

type ExistingImage = { id: number; src: string; alt: string };
export type ProductFormValues = {
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  price: number | null;
  stock: number | null;
  weight: number | null;
  published: boolean;
  images: ExistingImage[];
};

const rupiah = new Intl.NumberFormat("id-ID");
const digits = (value: string) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

const field = "min-h-12 w-full rounded-md border border-line bg-page px-3.5 text-base focus:border-accent focus:outline-none";
const label = "mb-2 block text-sm font-medium";

export function ProductForm({
  action,
  category: initialCategory,
  product,
  onDelete,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  category?: SearchOption;
  product?: ProductFormValues;
  onDelete?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product));
  const [category, setCategory] = useState(initialCategory ?? null);
  const [images, setImages] = useState(product?.images ?? []);
  
  // State input nilai untuk mencegah reset form saat error
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price !== null && product?.price !== undefined ? String(product.price) : "");
  const [stock, setStock] = useState(product?.stock !== null && product?.stock !== undefined ? String(product.stock) : "");
  const [weight, setWeight] = useState(product?.weight !== null && product?.weight !== undefined ? String(product.weight) : "");
  const [published, setPublished] = useState(product?.published ?? true);

  // State File & Preview Baru dengan validasi ukuran & tipe
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ url: string; name: string; sizeError?: string }[]>([]);

  // State pending untuk tombol hapus produk
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [previews]);

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosenFiles = Array.from(event.target.files ?? []);
    if (chosenFiles.length === 0) return;

    const newPreviewsData = chosenFiles.map((file) => {
      const isValidType = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5 MB
      let errorMsg = "";
      if (!isValidType) errorMsg = "Format harus JPG, PNG, atau WebP.";
      else if (!isValidSize) errorMsg = "Ukuran melebihi batas maksimal 5 MB.";

      return {
        url: URL.createObjectURL(file),
        name: file.name,
        sizeError: errorMsg,
      };
    });

    setNewFiles((prev) => [...prev, ...chosenFiles]);
    setPreviews((prev) => [...prev, ...newPreviewsData]);
    // Reset nilai input file supaya bisa pilih file yang sama jika diperlukan
    event.target.value = "";
  };

  const removeNewFile = (index: number) => {
    URL.revokeObjectURL(previews[index].url);
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const hasFileError = previews.some((p) => p.sizeError);

  const move = (index: number, delta: number) => {
    const next = [...images];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setImages(next);
  };

  return (
    <>
      <form
        action={(formData) => {
          // File baru dikirim dari state; input file bawaan dikosongkan setiap kali memilih.
          for (const file of newFiles) formData.append("newImages", file);
          formAction(formData);
        }}
        className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className={label}>Nama produk</label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(event) => {
                const nextName = event.currentTarget.value;
                setName(nextName);
                if (!product && !slugEdited) {
                  setSlug(sanitizeSlugInput(nextName).replace(/-+$/g, ""));
                }
              }}
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
              value={slug}
              placeholder="dibuat otomatis dari nama"
              aria-describedby="slug-help"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(event) => {
                const nextSlug = sanitizeSlugInput(event.currentTarget.value);
                setSlug(nextSlug);
                if (!product) {
                  setSlugEdited(nextSlug.length > 0);
                }
              }}
              onBlur={() => {
                const trimmed = slug.replace(/-+$/g, "");
                if (!product && !trimmed) {
                  setSlugEdited(false);
                  setSlug(sanitizeSlugInput(name).replace(/-+$/g, ""));
                } else {
                  setSlug(trimmed);
                }
              }}
              className={field}
            />
            <p id="slug-help" className="mt-2 text-sm text-muted">
              {product
                ? "Mengubah permalink membuat tautan lama yang sudah dibagikan tidak berlaku."
                : "Terisi otomatis dari nama produk. Ubah bila ingin memakai permalink sendiri, atau kosongkan agar kembali mengikuti nama."}
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
            
            {/* Input file manual agar file yang diunggah dikelola state */}
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
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              onChange={handleFilesChange}
            />
            
            {previews.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-muted">{previews.length} foto baru dipilih:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {previews.map((preview, idx) => (
                    <div key={preview.url} className={`flex items-center gap-3 rounded-md border p-2 ${preview.sizeError ? 'border-danger bg-danger/5' : 'border-line'}`}>
                      <div className="photo size-14 shrink-0 relative">
                        <Image src={preview.url} alt={preview.name} fill unoptimized className="object-cover rounded" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{preview.name}</p>
                        {preview.sizeError ? (
                          <p className="text-xs text-danger flex items-center gap-1 mt-0.5">
                            <WarningCircleIcon size={14} weight="bold" /> {preview.sizeError}
                          </p>
                        ) : (
                          <p className="text-xs text-muted">Siap diunggah</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeNewFile(idx)}
                        className="square size-8 text-muted hover:text-danger shrink-0"
                        title="Hapus foto ini"
                      >
                        <TrashIcon size={16} />
                      </button>
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
            <SearchableSelect
              id="categorySlug"
              name="categorySlug"
              required
              placeholder="Cari koleksi"
              className={field}
              value={category}
              onChange={setCategory}
              load={searchCategories}
            />
          </div>
          <div>
            <label htmlFor="price" className={label}>
              Harga <span className="font-normal text-muted">(opsional)</span>
            </label>
            <div className="flex min-h-12 items-center rounded-md border border-line bg-page focus-within:border-accent">
              <span className="pl-3.5 text-muted">Rp</span>
              <input
                id="price"
                name="price"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Kosongkan bila lewat konsultasi"
                value={price ? rupiah.format(Number(price)) : ""}
                onChange={(e) => setPrice(digits(e.target.value))}
                className="min-w-0 flex-1 bg-transparent px-2 py-3 text-right tabular-nums focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label htmlFor="stock" className={label}>
              Stok <span className="font-normal text-muted">(opsional)</span>
            </label>
            <input 
              id="stock" 
              name="stock" 
              type="text"
              inputMode="numeric" 
              placeholder="Tidak dibatasi" 
              aria-describedby="stock-hint"
              value={stock}
              onChange={(e) => setStock(digits(e.target.value))}
              className={field} 
            />
            <p id="stock-hint" className="mt-1.5 text-sm text-muted">
              Kosongkan bila produk selalu bisa dipesan.
            </p>
          </div>
          <div>
            <label htmlFor="weight" className={label}>
              Berat kemasan <span className="font-normal text-muted">(opsional)</span>
            </label>
            <div className="relative">
              <input 
                id="weight" 
                name="weight" 
                type="text"
                inputMode="numeric" 
                placeholder="Kosong dihitung 1.000"
                value={weight}
                onChange={(e) => setWeight(digits(e.target.value))}
                className={`${field} pr-14`} 
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted">gram</span>
            </div>
            <p className="mt-1.5 text-sm text-muted">Dipakai untuk menghitung ongkos kirim.</p>
          </div>
          <label className="flex items-start gap-3 rounded-md border border-line p-4">
            <input 
              type="checkbox" 
              name="published" 
              checked={published} 
              onChange={(e) => setPublished(e.target.checked)}
              className="mt-1 size-4 accent-[var(--accent)]" 
            />
            <span>
              <span className="block text-[15px] font-medium">Tampilkan di website</span>
              <span className="text-sm text-muted">Foto produk muncul di galeri koleksi.</span>
            </span>
          </label>
          
          {state.error && (
            <p role="alert" className="text-sm text-danger flex gap-2 items-center bg-danger/10 p-3 rounded-md border border-danger/35">
              <WarningCircleIcon size={18} weight="bold" className="shrink-0" />
              {state.error}
            </p>
          )}
          
          <div className="flex items-center gap-5">
            <button className="btn min-h-12 flex-1" disabled={pending || hasFileError}>
              {pending ? "Menyimpan…" : "Simpan"}
            </button>
            <Link href="/admin/produk" className="text-[15px] text-muted hover:text-ink">Batal</Link>
          </div>
        </div>
      </form>

      {onDelete && (
        <form
          action={() => {
            if (confirm(`Hapus produk "${product?.name}"? Tindakan ini tidak bisa dibatalkan.`)) {
              startDeleteTransition(async () => {
                await onDelete();
              });
            }
          }}
          className="mt-20 max-w-5xl"
        >
          <button 
            type="submit" 
            disabled={isDeleting}
            className="flex items-center gap-2 text-[15px] text-muted hover:text-ink disabled:opacity-50"
          >
            <TrashIcon size={18} aria-hidden="true" /> 
            {isDeleting ? "Menghapus…" : "Hapus produk"}
          </button>
        </form>
      )}
    </>
  );
}