import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Foto unggahan disimpan di luar `public/`, karena `next start` hanya melayani file `public/` yang
 * sudah ada saat build. File dilayani lewat route `/uploads/[file]`.
 */
export const uploadDir = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "storage/uploads");
export const uploadUrlPrefix = "/uploads/";
export const maxUploadBytes = 5 * 1024 * 1024;
export const uploadTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Mengembalikan pesan galat bila file tidak boleh diunggah. */
export function checkUpload(file: File) {
  if (!uploadTypes[file.type]) return `${file.name}: format harus JPG, PNG, atau WebP.`;
  if (file.size > maxUploadBytes) return `${file.name}: ukuran maksimal 5 MB.`;
  return null;
}

export async function saveUpload(file: File) {
  await mkdir(uploadDir, { recursive: true });
  const name = `${randomUUID()}.${uploadTypes[file.type]}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ uploadDir, name), Buffer.from(await file.arrayBuffer()));
  return `${uploadUrlPrefix}${name}`;
}

/** Foto bawaan di `public/images` tidak ikut dihapus. */
export async function removeUpload(src: string) {
  if (!src.startsWith(uploadUrlPrefix)) return;
  await rm(path.join(/*turbopackIgnore: true*/ uploadDir, path.basename(src)), { force: true });
}
