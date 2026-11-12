"use client";
import { useActionState, useEffect, useState } from "react";
import { ArrowCounterClockwiseIcon, ArrowSquareOutIcon, CheckCircleIcon, ImageIcon, WarningCircleIcon } from "@phosphor-icons/react";
import Image from "@/components/site-image";
import { saveBlocks, type ContentFormState } from "@/lib/content-actions";
import type { BlockField, BlockSection } from "@/lib/page-blocks";

const pages = [
  { key: "beranda", label: "Beranda", href: "/" },
  { key: "cerita", label: "Cerita", href: "/cerita" },
] as const;
// Sama dengan batas server (lib/uploads); dicek di sini agar admin tahu sebelum menyimpan.
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageBytes = 5 * 1024 * 1024;
const inputClass = "w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:border-accent focus:outline-none";

type NewImage = { file: File; url: string; error?: string };

const without = <T,>(record: Record<string, T>, key: string) => Object.fromEntries(Object.entries(record).filter(([name]) => name !== key));

const altField = (field: BlockField): BlockField => ({
  key: `${field.key}_alt`,
  label: "Teks alt (dibacakan pembaca layar)",
  kind: "text",
  fallback: field.alt ?? "",
  max: 150,
});

export function ContentForm({ sections, values }: { sections: BlockSection[]; values: Record<string, string> }) {
  const textFields = sections.flatMap((section) => section.fields.flatMap((field) => (field.kind === "image" ? (field.alt ? [altField(field)] : []) : [field])));
  const initialText = () => Object.fromEntries(textFields.map((field) => [field.key, values[field.key] ?? field.fallback]));
  const [tab, setTab] = useState<(typeof pages)[number]["key"]>("beranda");
  const [text, setText] = useState<Record<string, string>>(initialText);
  const [baseline, setBaseline] = useState<Record<string, string>>(initialText);
  const [images, setImages] = useState<Record<string, NewImage>>({});
  const [resets, setResets] = useState<Record<string, boolean>>({});

  const [state, formAction, pending] = useActionState(async (previous: ContentFormState, formData: FormData) => {
    // File dikirim dari state, bukan dari input file, supaya pilihan foto tidak hilang saat React mereset form.
    for (const [key, image] of Object.entries(images)) formData.set(key, image.file);
    const result = await saveBlocks(previous, formData);
    if (result.saved) {
      setBaseline(text);
      Object.values(images).forEach((image) => URL.revokeObjectURL(image.url));
      setImages({});
      setResets({});
    }
    return result;
  }, {});

  const changedKeys = new Set([
    ...Object.keys(text).filter((key) => text[key].trim() !== baseline[key].trim()),
    ...Object.keys(images),
    ...Object.keys(resets),
  ]);
  const dirty = changedKeys.size > 0;
  const fileError = Object.values(images).some((image) => image.error);
  const pageDirty = (page: string) =>
    sections.some((section) => section.page === page && section.fields.some((field) => changedKeys.has(field.key) || changedKeys.has(`${field.key}_alt`)));

  // Peringatan sebelum meninggalkan halaman dengan perubahan yang belum disimpan (tutup tab, atau klik link di admin).
  useEffect(() => {
    if (!dirty) return;
    const message = "Perubahan konten belum disimpan. Tetap tinggalkan halaman?";
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const click = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest("a[href]");
      if (!link || link.getAttribute("target") === "_blank" || confirm(message)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);

  function chooseImage(key: string, file: File | undefined) {
    if (!file) return;
    if (images[key]) URL.revokeObjectURL(images[key].url);
    const error = !imageTypes.includes(file.type)
      ? "Format harus JPG, PNG, atau WebP."
      : file.size > maxImageBytes
        ? "Ukuran melebihi 5 MB."
        : undefined;
    setImages({ ...images, [key]: { file, url: URL.createObjectURL(file), error } });
    setResets(without(resets, key));
  }

  function discardImage(key: string) {
    URL.revokeObjectURL(images[key].url);
    setImages(without(images, key));
  }

  const textInput = (field: BlockField) => {
    const value = text[field.key];
    const length = value.trim().length;
    const isDefault = value.trim() === "" || value.trim() === field.fallback;
    const counterId = `${field.key}-info`;
    return (
      <div key={field.key} className="min-w-0">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <label htmlFor={field.key} className="text-sm font-medium">
            {field.label}
            {isDefault && <span className="ml-2 rounded-sm border border-line px-1.5 py-0.5 text-[11px] font-normal text-muted">Bawaan</span>}
          </label>
          {!isDefault && (
            <button type="button" onClick={() => setText({ ...text, [field.key]: field.fallback })} className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink">
              <ArrowCounterClockwiseIcon size={13} aria-hidden="true" /> Kembalikan ke bawaan
            </button>
          )}
        </div>
        {field.kind === "textarea" ? (
          <textarea
            id={field.key}
            name={field.key}
            rows={field.key.endsWith("_title") ? 2 : 3}
            value={value}
            placeholder={field.fallback}
            aria-describedby={counterId}
            onChange={(event) => setText({ ...text, [field.key]: event.target.value })}
            className={inputClass}
          />
        ) : (
          <input
            id={field.key}
            name={field.key}
            value={value}
            placeholder={field.fallback}
            aria-describedby={counterId}
            onChange={(event) => setText({ ...text, [field.key]: event.target.value })}
            className={inputClass}
          />
        )}
        <p id={counterId} className="mt-1.5 flex justify-between gap-3 text-xs text-muted">
          <span>{length === 0 ? "Kosong: memakai teks bawaan." : ""}</span>
          {field.max && (
            <span className={length > field.max ? "text-danger" : ""}>
              {length}/{field.max}
              {length > field.max && " · terlalu panjang, bisa merusak tata letak"}
            </span>
          )}
        </p>
      </div>
    );
  };

  const imageInput = (field: BlockField) => {
    const fresh = images[field.key];
    const reset = resets[field.key];
    const current = reset ? field.fallback : values[field.key];
    const isDefault = current === field.fallback;
    return (
      <fieldset key={field.key} className="min-w-0 space-y-4 rounded-lg border border-line p-4">
        <legend className="px-1 text-sm font-medium">{field.label}</legend>
        {field.hint && <p className="-mt-1 text-xs text-muted">{field.hint}</p>}
        {reset && <input type="hidden" name={`${field.key}__reset`} value="1" />}
        <div className="flex flex-wrap gap-4">
          <figure className="w-32">
            <div className="photo relative aspect-[4/5] w-32 overflow-hidden rounded-md">
              <Image src={current} alt="" fill sizes="128px" className="object-cover" />
            </div>
            <figcaption className="mt-1.5 text-xs text-muted">
              {fresh ? "Sekarang" : reset ? "Bawaan (belum disimpan)" : isDefault ? "Sekarang · bawaan" : "Sekarang"}
            </figcaption>
          </figure>
          {fresh && (
            <figure className="w-32">
              <div className={`photo relative aspect-[4/5] w-32 overflow-hidden rounded-md ${fresh.error ? "ring-2 ring-danger" : "ring-2 ring-accent"}`}>
                <Image src={fresh.url} alt="" fill unoptimized className="object-cover" />
              </div>
              <figcaption className={`mt-1.5 text-xs ${fresh.error ? "text-danger" : "text-accent"}`}>
                {fresh.error ?? "Baru (belum disimpan)"}
              </figcaption>
            </figure>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-line px-3.5 hover:border-accent focus-within:border-accent">
            <ImageIcon size={18} aria-hidden="true" /> {fresh ? "Pilih foto lain" : "Ganti foto"}
            <input
              type="file"
              accept={imageTypes.join(",")}
              className="sr-only"
              onChange={(event) => {
                chooseImage(field.key, event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          {fresh && (
            <button type="button" onClick={() => discardImage(field.key)} className="text-muted hover:text-ink">
              Batalkan foto baru
            </button>
          )}
          {!fresh && !isDefault && (
            <button type="button" onClick={() => setResets({ ...resets, [field.key]: true })} className="inline-flex items-center gap-1 text-muted hover:text-ink">
              <ArrowCounterClockwiseIcon size={14} aria-hidden="true" /> Kembalikan ke foto bawaan
            </button>
          )}
          {reset && (
            <button type="button" onClick={() => setResets(without(resets, field.key))} className="text-muted hover:text-ink">
              Batal
            </button>
          )}
        </div>
        {field.alt && textInput(altField(field))}
      </fieldset>
    );
  };

  return (
    <form action={formAction} className="mt-8 max-w-3xl">
      <div role="tablist" aria-label="Halaman" className="flex gap-6 border-b border-line">
        {pages.map((page) => (
          <button
            key={page.key}
            type="button"
            role="tab"
            id={`tab-${page.key}`}
            aria-selected={tab === page.key}
            aria-controls={`panel-${page.key}`}
            onClick={() => setTab(page.key)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-1 py-3 text-[15px] ${tab === page.key ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"}`}
          >
            {page.label}
            {pageDirty(page.key) && <span className="size-2 rounded-full bg-accent" aria-label="ada perubahan" />}
          </button>
        ))}
      </div>

      {pages.map((page) => (
        // Panel lain disembunyikan, bukan dilepas, supaya semua isian tetap ikut terkirim.
        <div key={page.key} role="tabpanel" id={`panel-${page.key}`} aria-labelledby={`tab-${page.key}`} hidden={tab !== page.key} className="space-y-8 pt-8">
          {sections
            .filter((section) => section.page === page.key)
            .map((section) => (
              <section key={section.title} className="space-y-5 rounded-xl border border-line bg-surface p-5 md:p-7">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h2 className="text-xl font-medium tracking-tight">{section.title}</h2>
                    <p className="mt-1 text-sm text-muted">{section.description}</p>
                  </div>
                  <a href={section.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                    Lihat di halaman <ArrowSquareOutIcon size={14} aria-hidden="true" />
                  </a>
                </div>
                {section.fields.map((field) => (field.kind === "image" ? imageInput(field) : textInput(field)))}
              </section>
            ))}
        </div>
      ))}

      <div className="sticky bottom-0 z-10 mt-8 -mx-5 border-t border-line bg-page/95 px-5 py-4 backdrop-blur md:mx-0 md:rounded-t-xl md:border-x">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" className="flex min-w-0 items-center gap-2 text-sm">
            {state.error ? (
              <span role="alert" className="flex items-center gap-2 text-danger">
                <WarningCircleIcon size={18} className="shrink-0" aria-hidden="true" /> Tidak ada yang disimpan. {state.error}
              </span>
            ) : pending ? (
              <span className="text-muted">Menyimpan…</span>
            ) : dirty ? (
              <span className="text-ink">{changedKeys.size} perubahan belum disimpan</span>
            ) : state.saved ? (
              <span className="flex flex-wrap items-center gap-x-2">
                <CheckCircleIcon size={18} className="shrink-0 text-accent" aria-hidden="true" /> Tersimpan.
                {pages.map((page) => (
                  <a key={page.key} href={page.href} target="_blank" rel="noreferrer" className="text-accent underline">
                    Lihat {page.label}
                  </a>
                ))}
              </span>
            ) : (
              <span className="text-muted">Belum ada perubahan.</span>
            )}
          </p>
          <button type="submit" disabled={!dirty || pending || fileError} className="btn min-h-11 w-full px-6 text-[15px] sm:w-auto">
            {pending ? "Menyimpan…" : "Simpan perubahan"}
          </button>
        </div>
      </div>
    </form>
  );
}
