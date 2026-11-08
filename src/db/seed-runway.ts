/**
 * Memindahkan foto fashion show lama (src/lib/content.ts `runwayPhotos`) ke tabel runway_photos, dengan urutan yang
 * sama agar tampilan website tidak berubah. Jalankan sekali setelah `npm run db:migrate`: `npm run db:seed-runway`.
 * Tidak melakukan apa pun bila tabel sudah terisi, jadi aman dijalankan ulang.
 */
import { runwayPhotos as legacy } from "../lib/content";
import { db } from "./index";
import { runwayPhotos } from "./schema";

async function seed() {
  if (await db.$count(runwayPhotos)) {
    console.log("Foto fashion show sudah ada, seed dilewati.");
    return;
  }
  await db.insert(runwayPhotos).values(legacy.map((photo, index) => ({ src: photo.src, alt: photo.alt, sortOrder: index })));
  console.log(`Seed selesai: ${legacy.length} foto fashion show.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});