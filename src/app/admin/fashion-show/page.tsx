import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { ArrowDownIcon, ArrowUpIcon, EyeIcon, EyeSlashIcon, GridFourIcon, ListIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "@/components/site-image";
import { AddRunwayForm, DeleteRunwayButton, EditRunwayForm } from "@/components/runway-admin";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { runwayPhotos, type RunwayPhotoRow } from "@/db/schema";
import { moveRunwayPhoto, toggleRunwayPhoto } from "@/lib/runway-actions";
export const metadata: Metadata = { title: "Fashion show" };

const iconButton =
  "grid size-10 place-items-center rounded-md border border-line text-muted transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40";

const views = [
  { value: "daftar", label: "Daftar", href: "/admin/fashion-show", icon: ListIcon },
  { value: "grid", label: "Grid", href: "/admin/fashion-show?tampilan=grid", icon: GridFourIcon },
] as const;

/** Tombol urut, sembunyikan, dan hapus; dipakai di tampilan daftar maupun grid. */
function Actions({ photo, first, last }: { photo: RunwayPhotoRow; first: boolean; last: boolean }) {
  return (
    <>
      <form action={moveRunwayPhoto.bind(null, photo.id, "up")}>
        <button className={iconButton} disabled={first} aria-label="Naikkan urutan">
          <ArrowUpIcon size={18} aria-hidden="true" />
        </button>
      </form>
      <form action={moveRunwayPhoto.bind(null, photo.id, "down")}>
        <button className={iconButton} disabled={last} aria-label="Turunkan urutan">
          <ArrowDownIcon size={18} aria-hidden="true" />
        </button>
      </form>
      <form action={toggleRunwayPhoto.bind(null, photo.id)}>
        <button className={iconButton} aria-label={photo.published ? "Sembunyikan dari website" : "Tampilkan di website"}>
          {photo.published ? <EyeIcon size={18} aria-hidden="true" /> : <EyeSlashIcon size={18} aria-hidden="true" />}
        </button>
      </form>
      <DeleteRunwayButton id={photo.id} />
    </>
  );
}

const meta = (photo: RunwayPhotoRow) => [photo.caption, photo.city, photo.year].filter(Boolean).join(" · ") || "Belum ada acara";

export default async function AdminRunwayPage({ searchParams }: { searchParams: Promise<{ tampilan?: string }> }) {
  await requireAdminPage();
  const { tampilan } = await searchParams;
  const view = tampilan === "grid" ? "grid" : "daftar";
  const rows = await db.select().from(runwayPhotos).orderBy(asc(runwayPhotos.sortOrder), asc(runwayPhotos.id));
  const shown = rows.filter((photo) => photo.published).length;
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Fashion show</h1>
      <p className="mt-2 text-muted">
        {rows.length} foto, {shown} tampil di website. Urutan di sini sama dengan urutan di galeri, arsip, dan beranda.
      </p>

      <section aria-labelledby="tambah-foto" className="mt-8 rounded-2xl border border-line p-6">
        <h2 id="tambah-foto" className="mb-5 text-xl tracking-[-.03em]">
          Tambah foto
        </h2>
        <AddRunwayForm />
      </section>

      <div className="mt-10 flex items-center justify-between gap-4">
        <h2 className="text-xl tracking-[-.03em]">Semua foto</h2>
        <nav aria-label="Pilihan tampilan" className="flex rounded-md border border-line p-1">
          {views.map(({ value, label, href, icon: Icon }) => (
            <Link
              key={value}
              href={href}
              aria-current={view === value ? "page" : undefined}
              className={`flex min-h-9 items-center gap-2 rounded px-3 text-sm transition-colors ${view === value ? "bg-surface font-medium" : "text-muted hover:text-ink"}`}
            >
              <Icon size={18} aria-hidden="true" /> {label}
            </Link>
          ))}
        </nav>
      </div>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted">Belum ada foto. Unggah yang pertama di atas.</p>
      ) : view === "grid" ? (
        <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {rows.map((photo, index) => (
            <li key={photo.id} className="flex flex-col rounded-2xl border border-line p-3">
              <div className="photo relative aspect-[2/3]">
                <Image
                  src={photo.src}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 45vw, 20vw"
                  className={`object-cover ${photo.published ? "" : "opacity-50"}`}
                />
                <span
                  className={`absolute top-2 left-2 rounded-full px-2.5 py-1 text-xs ${photo.published ? "bg-page/90 text-accent" : "bg-page/90 text-muted"}`}
                >
                  {photo.published ? "Tampil" : "Disembunyikan"}
                </span>
                <span className="absolute right-2 bottom-2 rounded-full bg-page/90 px-2 py-0.5 text-xs tabular-nums">{index + 1}</span>
              </div>
              <p className="mt-3 truncate text-sm font-medium" title={photo.alt}>
                {photo.alt}
              </p>
              <p className="truncate text-xs text-muted">{meta(photo)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Actions photo={photo} first={index === 0} last={index === rows.length - 1} />
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-accent">Edit detail</summary>
                <EditRunwayForm photo={photo} compact />
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {rows.map((photo, index) => (
            <li key={photo.id} className="py-5">
              <div className="grid grid-cols-[64px_minmax(0,1fr)] items-center gap-4 md:grid-cols-[64px_minmax(0,1fr)_auto]">
                <div className="photo aspect-[2/3] w-16">
                  <Image src={photo.src} alt="" fill sizes="64px" className="object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{photo.alt}</p>
                  <p className="mt-0.5 truncate text-sm text-muted">{meta(photo)}</p>
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs ${photo.published ? "bg-surface text-accent" : "border border-line text-muted"}`}
                  >
                    {photo.published ? "Tampil" : "Disembunyikan"}
                  </span>
                </div>
                <div className="col-span-2 flex flex-wrap items-center gap-2 md:col-span-1">
                  <Actions photo={photo} first={index === 0} last={index === rows.length - 1} />
                </div>
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-accent">Edit detail</summary>
                <EditRunwayForm photo={photo} />
              </details>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}