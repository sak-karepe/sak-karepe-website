import { db } from "@/db";
import { pageBlocks } from "@/db/schema";
import { productImage, runwayImage } from "@/lib/assets";

export type BlockField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "image";
  fallback: string;
};

/** Satu-satunya daftar blok konten: dipakai halaman publik (nilai bawaan) dan form admin (kolom yang boleh diubah). */
export const blockSections: { title: string; description: string; fields: BlockField[] }[] = [
  {
    title: "Beranda: hero",
    description: "Judul, subjudul, dan gambar utama di halaman depan.",
    fields: [
      { key: "home_hero_title_1", label: "Judul baris 1", kind: "text", fallback: "Ecoprint dari" },
      { key: "home_hero_title_2", label: "Judul baris 2", kind: "text", fallback: "ruang belajar." },
      {
        key: "home_hero_subtitle",
        label: "Subjudul",
        kind: "textarea",
        fallback:
          "Busana, tas, kain, dan sepatu bermotif daun dari pendidikan vokasi SLB Khusus Bina Mandiri, Surabaya. Karyanya telah tampil di panggung Jakarta, Yogyakarta, dan Surabaya.",
      },
      { key: "home_hero_image", label: "Gambar hero", kind: "image", fallback: runwayImage("8a672849-8119-4b5d-9aa4-181c2a4badf5") },
    ],
  },
  {
    title: "Beranda: cerita singkat",
    description: "Bagian cerita di halaman depan. Enter pada judul menjadi pindah baris.",
    fields: [
      { key: "home_story_title", label: "Judul", kind: "textarea", fallback: "Dimulai dari\nbatik tulis." },
      {
        key: "home_story_p1",
        label: "Paragraf 1",
        kind: "textarea",
        fallback:
          "Sak Karepe tumbuh dari pendidikan vokasi di SLB Khusus Bina Mandiri. Sejak 2004, peserta didik diperkenalkan pada batik tulis dengan pewarnaan alami.",
      },
      {
        key: "home_story_p2",
        label: "Paragraf 2",
        kind: "textarea",
        fallback:
          "Jumputan, shibori, lalu ecoprint membuka cara berkarya yang disesuaikan dengan kemampuan setiap anak. Setiap potensi mendapat ruang untuk tumbuh.",
      },
      { key: "home_story_img_main", label: "Gambar utama", kind: "image", fallback: productImage("7e60ced3-8a64-4f26-9237-4cfc0aff6a41") },
      { key: "home_story_img_small", label: "Gambar kecil", kind: "image", fallback: productImage("3ff6a2dc-af7f-47d0-8014-986368cfbe6c") },
    ],
  },
  {
    title: "Cerita: hero",
    description: "Judul, subjudul, dan gambar utama di halaman Cerita.",
    fields: [
      { key: "story_hero_title_1", label: "Judul baris 1", kind: "text", fallback: "Dari sekolah." },
      { key: "story_hero_title_2", label: "Judul baris 2", kind: "text", fallback: "Menuju dunia." },
      {
        key: "story_hero_subtitle",
        label: "Subjudul",
        kind: "textarea",
        fallback: "Di balik karya Sak Karepe, ada ruang belajar dan kesempatan untuk mengembangkan potensi setiap anak.",
      },
      { key: "story_hero_img", label: "Gambar hero", kind: "image", fallback: productImage("7e60ced3-8a64-4f26-9237-4cfc0aff6a41") },
    ],
  },
  {
    title: "Cerita: timeline 2004",
    description: "Bagian awal perjalanan. Enter pada judul menjadi pindah baris.",
    fields: [
      { key: "story_2004_year", label: "Tahun", kind: "text", fallback: "2004" },
      { key: "story_2004_label", label: "Label tahun", kind: "text", fallback: "Awal pendidikan batik tulis" },
      { key: "story_2004_title", label: "Judul", kind: "textarea", fallback: "Belajar dari\nwarna alami." },
      {
        key: "story_2004_p1",
        label: "Paragraf 1",
        kind: "textarea",
        fallback:
          "Sejak 2004, SLB Khusus Bina Mandiri mengenalkan batik tulis dengan pewarnaan alami kepada peserta didik. Kegiatan ini memberi ruang untuk belajar, berekspresi, dan melatih ketekunan.",
      },
      {
        key: "story_2004_p2",
        label: "Paragraf 2",
        kind: "textarea",
        fallback:
          "Seiring perubahan kemampuan dan karakter anak, teknik jumputan dan shibori ikut diperkenalkan. Cara berkarya disesuaikan dengan kebutuhan peserta didik.",
      },
    ],
  },
];

export const blockFields = blockSections.flatMap((section) => section.fields);

/** Semua blok dalam satu query; blok kosong atau belum disimpan memakai nilai bawaan. */
export async function getBlocks(): Promise<Record<string, string>> {
  const saved = new Map<string, string>();
  try {
    for (const row of await db.select().from(pageBlocks)) saved.set(row.key, row.value);
  } catch (err) {
    // Halaman publik tetap tampil dengan teks bawaan bila tabel belum dimigrasi.
    console.error("Gagal membaca page_blocks:", err);
  }
  return Object.fromEntries(blockFields.map(({ key, fallback }) => [key, saved.get(key)?.trim() || fallback]));
}
