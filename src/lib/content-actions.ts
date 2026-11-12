"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { pageBlocks } from "@/db/schema";
import { blockFields, getBlocks } from "@/lib/page-blocks";
import { checkUpload, removeUpload, saveUpload } from "@/lib/uploads";

export type ContentFormState = { error?: string; saved?: boolean };

/**
 * Menyimpan semua blok konten. Teks yang sama dengan bawaan atau kosong disimpan kosong, jadi tetap mengikuti teks bawaan.
 * Gambar: file baru di `key`, atau `${key}__reset` untuk kembali ke foto bawaan.
 */
export async function saveBlocks(_state: ContentFormState, formData: FormData): Promise<ContentFormState> {
  await requireAdmin();

  // Cek semua file dulu, supaya tidak ada yang tersimpan setengah jalan.
  const uploads: { key: string; file: File }[] = [];
  const resets: string[] = [];
  for (const { key, kind, label } of blockFields) {
    if (kind !== "image") continue;
    const file = formData.get(key);
    if (file instanceof File && file.size > 0) {
      const uploadError = checkUpload(file);
      if (uploadError) return { error: `${label}: ${uploadError}` };
      uploads.push({ key, file });
    } else if (formData.get(`${key}__reset`) === "1") resets.push(key);
  }

  const current = await getBlocks();
  const values: { key: string; value: string }[] = [];
  for (const { key, kind, fallback } of blockFields) {
    const value = formData.get(key);
    if (kind === "image" || typeof value !== "string") continue;
    const text = value.trim().slice(0, 2000);
    values.push({ key, value: text === fallback ? "" : text });
  }
  for (const key of resets) values.push({ key, value: "" });
  try {
    for (const { key, file } of uploads) values.push({ key, value: await saveUpload(file) });
  } catch (error) {
    console.error("[upload] Foto konten gagal disimpan", error);
    return { error: "Foto belum bisa disimpan. Coba lagi sebentar." };
  }

  const now = new Date();
  for (const { key, value } of values) {
    await db
      .insert(pageBlocks)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: pageBlocks.key, set: { value, updatedAt: now } });
  }
  // Foto lama baru dihapus setelah penggantinya tersimpan; foto bawaan di public/ tidak ikut terhapus.
  for (const key of [...uploads.map((upload) => upload.key), ...resets]) await removeUpload(current[key]);

  revalidatePath("/");
  revalidatePath("/cerita");
  revalidatePath("/admin/konten");
  return { saved: true };
}
