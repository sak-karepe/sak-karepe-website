"use server";
import { asc, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { runwayPhotos } from "@/db/schema";
import { checkUpload, removeUpload, saveUpload } from "@/lib/uploads";

export type RunwayFormState = { error?: string; saved?: boolean };

const maxFiles = 20;

function refresh() {
  revalidatePath("/");
  revalidatePath("/fashion-show");
  revalidatePath("/admin/fashion-show");
}

const text = (formData: FormData, key: string, limit: number) => String(formData.get(key) ?? "").trim().slice(0, limit) || null;

function parseYear(formData: FormData) {
  const raw = String(formData.get("year") ?? "").trim();
  if (!raw) return { value: null } as const;
  const year = Number(raw);
  return Number.isInteger(year) && year >= 1990 && year <= 2100 ? ({ value: year } as const) : ({ error: "Tahun tidak valid." } as const);
}

/** Unggah satu atau beberapa foto sekaligus; acara, kota, dan tahun berlaku untuk semua foto yang diunggah. */
export async function addRunwayPhotos(_state: RunwayFormState, formData: FormData): Promise<RunwayFormState> {
  await requireAdmin();
  const files = formData.getAll("photos").filter((file): file is File => file instanceof File && file.size > 0);
  if (!files.length) return { error: "Pilih minimal satu foto." };
  if (files.length > maxFiles) return { error: `Maksimal ${maxFiles} foto sekali unggah.` };
  const uploadError = files.map(checkUpload).find(Boolean);
  if (uploadError) return { error: uploadError };
  const year = parseYear(formData);
  if ("error" in year) return { error: year.error };
  const caption = text(formData, "caption", 120);
  const alt = text(formData, "alt", 200) ?? (caption ? `Dokumentasi ${caption}` : "Dokumentasi fashion show Sak Karepe");
  let sources: string[];
  try {
    sources = await Promise.all(files.map(saveUpload));
  } catch (error) {
    console.error("[upload] Foto fashion show gagal disimpan", error);
    return { error: "Foto belum bisa disimpan. Coba lagi sebentar." };
  }
  const [{ last }] = await db.select({ last: max(runwayPhotos.sortOrder) }).from(runwayPhotos);
  await db.insert(runwayPhotos).values(
    sources.map((src, index) => ({ src, alt, caption, city: text(formData, "city", 60), year: year.value, sortOrder: (last ?? -1) + 1 + index })),
  );
  refresh();
  return { saved: true };
}

export async function updateRunwayPhoto(id: number, _state: RunwayFormState, formData: FormData): Promise<RunwayFormState> {
  await requireAdmin();
  const alt = text(formData, "alt", 200);
  if (!alt) return { error: "Teks alternatif (deskripsi foto) wajib diisi." };
  const year = parseYear(formData);
  if ("error" in year) return { error: year.error };
  await db
    .update(runwayPhotos)
    .set({
      alt,
      caption: text(formData, "caption", 120),
      city: text(formData, "city", 60),
      year: year.value,
      published: formData.get("published") === "on",
      updatedAt: new Date(),
    })
    .where(eq(runwayPhotos.id, id));
  refresh();
  return { saved: true };
}

/** Menukar posisi foto dengan tetangganya; seluruh urutan dinomori ulang agar tidak ada nomor ganda. */
export async function moveRunwayPhoto(id: number, direction: "up" | "down") {
  await requireAdmin();
  const ids = (await db.select({ id: runwayPhotos.id }).from(runwayPhotos).orderBy(asc(runwayPhotos.sortOrder), asc(runwayPhotos.id))).map(
    (row) => row.id,
  );
  const from = ids.indexOf(id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  await db.transaction(async (tx) => {
    for (const [index, photoId] of ids.entries()) await tx.update(runwayPhotos).set({ sortOrder: index }).where(eq(runwayPhotos.id, photoId));
  });
  refresh();
}

/** Sembunyikan atau tampilkan foto di website tanpa menghapusnya. */
export async function toggleRunwayPhoto(id: number) {
  await requireAdmin();
  const photo = await db.query.runwayPhotos.findFirst({ where: eq(runwayPhotos.id, id), columns: { published: true } });
  if (!photo) return;
  await db.update(runwayPhotos).set({ published: !photo.published, updatedAt: new Date() }).where(eq(runwayPhotos.id, id));
  refresh();
}

/** Hapus foto dari database; file unggahan ikut dihapus, foto bawaan di public/images tidak. */
export async function deleteRunwayPhoto(id: number) {
  await requireAdmin();
  const [photo] = await db.delete(runwayPhotos).where(eq(runwayPhotos.id, id)).returning({ src: runwayPhotos.src });
  if (photo) await removeUpload(photo.src);
  refresh();
}