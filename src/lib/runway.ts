import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { runwayPhotos } from "@/db/schema";

/** Foto yang dikirim ke komponen galeri, arsip, dan lightbox. */
export type RunwayPhoto = {
  id: number;
  src: string;
  alt: string;
  /** Nama acara, mis. "Jakarta Fashion Week". */
  caption: string | null;
  city: string | null;
  year: number | null;
};

/** Foto yang tampil di website (yang disembunyikan tidak ikut), urut sesuai pengaturan admin. `limit` untuk beranda. */
export async function getRunwayPhotos(limit?: number): Promise<RunwayPhoto[]> {
  const rows = await db
    .select({
      id: runwayPhotos.id,
      src: runwayPhotos.src,
      alt: runwayPhotos.alt,
      caption: runwayPhotos.caption,
      city: runwayPhotos.city,
      year: runwayPhotos.year,
    })
    .from(runwayPhotos)
    .where(eq(runwayPhotos.published, true))
    .orderBy(asc(runwayPhotos.sortOrder), asc(runwayPhotos.id));
  return limit ? rows.slice(0, limit) : rows;
}