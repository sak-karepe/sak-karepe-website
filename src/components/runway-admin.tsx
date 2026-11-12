"use client";
import { useActionState } from "react";
import { addRunwayPhotos, deleteRunwayPhoto, updateRunwayPhoto, type RunwayFormState } from "@/lib/runway-actions";
import type { RunwayPhoto } from "@/lib/runway";

/** Tombol "Choose Files" bawaan browser tampil seperti teks biasa karena reset CSS situs, jadi digayakan lewat file:. */
const fileInput =
  "block w-full cursor-pointer rounded-md border border-dashed border-line bg-page p-3 text-[15px] text-muted file:mr-4 file:cursor-pointer file:rounded-md file:border file:border-line file:bg-surface file:px-4 file:py-2.5 file:text-[15px] file:font-medium file:text-ink hover:border-accent hover:file:border-accent";
const input = "min-h-11 w-full rounded-md border border-line bg-page px-3 text-[15px] focus:border-accent focus:outline-none";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Unggah satu atau beberapa foto baru; acara, kota, dan tahun berlaku untuk semuanya. */
export function AddRunwayForm() {
  const [state, action, pending] = useActionState<RunwayFormState, FormData>(addRunwayPhotos, {});
  return (
    <form action={action} className="grid gap-4 md:grid-cols-3">
      <Field label="Foto (JPG, PNG, atau WebP, maks. 5 MB)" className="md:col-span-3">
        <input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required className={fileInput} />
      </Field>
      <Field label="Acara (opsional)">
        <input name="caption" maxLength={120} placeholder="Jakarta Fashion Week" className={input} />
      </Field>
      <Field label="Kota (opsional)">
        <input name="city" maxLength={60} placeholder="Jakarta" className={input} />
      </Field>
      <Field label="Tahun (opsional)">
        <input name="year" inputMode="numeric" pattern="\d{4}" maxLength={4} placeholder="2025" className={input} />
      </Field>
      <Field label="Deskripsi foto (opsional, untuk pembaca layar)" className="md:col-span-3">
        <input name="alt" maxLength={200} placeholder="Busana ecoprint hijau dengan tas bermotif daun" className={input} />
      </Field>
      <div className="flex flex-wrap items-center gap-4 md:col-span-3">
        <button className="btn min-h-11 px-4 text-[15px]" disabled={pending}>
          {pending ? "Mengunggah…" : "Unggah foto"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.saved && !pending && (
          <p role="status" className="text-sm text-accent">
            Foto ditambahkan di urutan paling akhir.
          </p>
        )}
      </div>
    </form>
  );
}

/** `compact`: satu kolom, untuk dipakai di dalam kartu grid yang sempit. */
export function EditRunwayForm({ photo, compact = false }: { photo: RunwayPhoto & { published: boolean }; compact?: boolean }) {
  const wide = compact ? "" : "md:col-span-3";
  const [state, action, pending] = useActionState<RunwayFormState, FormData>(updateRunwayPhoto.bind(null, photo.id), {});
  return (
    <form action={action} className={`mt-4 grid gap-4 ${compact ? "" : "md:grid-cols-3"}`}>
      <Field label="Deskripsi foto" className={wide}>
        <input name="alt" required maxLength={200} defaultValue={photo.alt} className={input} />
      </Field>
      <Field label="Acara">
        <input name="caption" maxLength={120} defaultValue={photo.caption ?? ""} className={input} />
      </Field>
      <Field label="Kota">
        <input name="city" maxLength={60} defaultValue={photo.city ?? ""} className={input} />
      </Field>
      <Field label="Tahun">
        <input name="year" inputMode="numeric" pattern="\d{4}" maxLength={4} defaultValue={photo.year ?? ""} className={input} />
      </Field>
      <label className={`flex items-center gap-2 text-[15px] ${wide}`}>
        <input type="checkbox" name="published" defaultChecked={photo.published} className="size-4 accent-[var(--accent)]" />
        Tampilkan di website
      </label>
      <div className={`flex flex-wrap items-center gap-4 ${wide}`}>
        <button className="btn min-h-11 px-4 text-[15px]" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.saved && !pending && (
          <p role="status" className="text-sm text-accent">
            Tersimpan.
          </p>
        )}
      </div>
    </form>
  );
}

export function DeleteRunwayButton({ id }: { id: number }) {
  return (
    <form action={deleteRunwayPhoto.bind(null, id)}>
      <button
        className="min-h-10 rounded-md border border-line px-3 text-sm text-danger transition-colors hover:border-danger"
        onClick={(event) => {
          if (!confirm("Hapus foto ini dari website? Tindakan ini tidak bisa dibatalkan.")) event.preventDefault();
        }}
      >
        Hapus
      </button>
    </form>
  );
}