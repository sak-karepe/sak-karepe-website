import { db } from "@/db";
import { pageBlocks } from "@/db/schema";
import { productImage, runwayImage } from "@/lib/assets";

export type BlockField = {
  key: string;
  label: string;
  kind: "text" | "textarea" | "image";
  fallback: string;
  /** Panjang teks yang masih pas di layout; lewat dari ini hanya diperingatkan. */
  max?: number;
  /** Gambar: panduan rasio/ukuran foto. */
  hint?: string;
  /** Gambar: teks alt bawaan; form menambah blok `${key}_alt` yang bisa diubah. */
  alt?: string;
};

export type BlockSection = { page: "beranda" | "cerita"; href: string; title: string; description: string; fields: BlockField[] };

/** Satu-satunya daftar blok konten: dipakai halaman publik (nilai bawaan) dan form admin (kolom yang boleh diubah). */
export const blockSections: BlockSection[] = [
  {
    page: "beranda",
    href: "/",
    title: "Hero",
    description: "Judul, subjudul, dan gambar utama di halaman depan.",
    fields: [
      { key: "home_hero_title_1", label: "Judul baris 1", kind: "text", max: 24, fallback: "Ecoprint dari" },
      { key: "home_hero_title_2", label: "Judul baris 2", kind: "text", max: 24, fallback: "ruang belajar." },
      {
        key: "home_hero_subtitle",
        label: "Subjudul",
        kind: "textarea",
        max: 220,
        fallback:
          "Busana, tas, kain, dan sepatu bermotif daun dari pendidikan vokasi SLB Khusus Bina Mandiri, Surabaya. Karyanya telah tampil di panggung Jakarta, Yogyakarta, dan Surabaya.",
      },
      {
        key: "home_hero_image",
        label: "Gambar hero",
        kind: "image",
        fallback: runwayImage("8a672849-8119-4b5d-9aa4-181c2a4badf5"),
        hint: "Potret 4:5, minimal 1200 × 1500 px. Bagian tengah agak ke atas yang selalu terlihat.",
        alt: "Model memperagakan busana dan luaran ecoprint bernuansa hijau di depan lengkung taman",
      },
    ],
  },
  {
    page: "beranda",
    href: "/#cerita",
    title: "Cerita singkat",
    description: "Bagian cerita di halaman depan.",
    fields: [
      { key: "home_story_title", label: "Judul (Enter = pindah baris)", kind: "textarea", max: 40, fallback: "Dimulai dari\nbatik tulis." },
      {
        key: "home_story_p1",
        label: "Paragraf 1",
        kind: "textarea",
        max: 320,
        fallback:
          "Sak Karepe tumbuh dari pendidikan vokasi di SLB Khusus Bina Mandiri. Sejak 2004, peserta didik diperkenalkan pada batik tulis dengan pewarnaan alami.",
      },
      {
        key: "home_story_p2",
        label: "Paragraf 2",
        kind: "textarea",
        max: 320,
        fallback:
          "Jumputan, shibori, lalu ecoprint membuka cara berkarya yang disesuaikan dengan kemampuan setiap anak. Setiap potensi mendapat ruang untuk tumbuh.",
      },
      {
        key: "home_story_img_main",
        label: "Gambar utama",
        kind: "image",
        fallback: productImage("7e60ced3-8a64-4f26-9237-4cfc0aff6a41"),
        hint: "Mendekati persegi, minimal 1200 px sisi terpendek.",
        alt: "Koleksi busana Sak Karepe di dekat jendela",
      },
      {
        key: "home_story_img_small",
        label: "Gambar kecil (menumpuk di pojok gambar utama)",
        kind: "image",
        fallback: productImage("3ff6a2dc-af7f-47d0-8014-986368cfbe6c"),
        hint: "Potret sempit sekitar 2:3, minimal 600 px lebar.",
        alt: "Kain bermotif daun dengan kombinasi tepi bergaris",
      },
    ],
  },
  {
    page: "cerita",
    href: "/cerita",
    title: "Hero",
    description: "Judul, subjudul, dan gambar utama di halaman Cerita.",
    fields: [
      { key: "story_hero_title_1", label: "Judul baris 1", kind: "text", max: 24, fallback: "Dari sekolah." },
      { key: "story_hero_title_2", label: "Judul baris 2", kind: "text", max: 24, fallback: "Menuju dunia." },
      {
        key: "story_hero_subtitle",
        label: "Subjudul",
        kind: "textarea",
        max: 220,
        fallback: "Di balik karya Sak Karepe, ada ruang belajar dan kesempatan untuk mengembangkan potensi setiap anak.",
      },
      {
        key: "story_hero_img",
        label: "Gambar hero",
        kind: "image",
        fallback: productImage("7e60ced3-8a64-4f26-9237-4cfc0aff6a41"),
        hint: "Potret 4:5, minimal 1200 × 1500 px.",
        alt: "Busana Sak Karepe tersusun di dekat jendela",
      },
    ],
  },
  {
    page: "cerita",
    href: "/cerita",
    title: "Timeline 2004",
    description: "Bagian awal perjalanan.",
    fields: [
      { key: "story_2004_year", label: "Tahun", kind: "text", max: 4, fallback: "2004" },
      { key: "story_2004_label", label: "Label tahun", kind: "text", max: 40, fallback: "Awal pendidikan batik tulis" },
      { key: "story_2004_title", label: "Judul (Enter = pindah baris)", kind: "textarea", max: 40, fallback: "Belajar dari\nwarna alami." },
      {
        key: "story_2004_p1",
        label: "Paragraf 1",
        kind: "textarea",
        max: 320,
        fallback:
          "Sejak 2004, SLB Khusus Bina Mandiri mengenalkan batik tulis dengan pewarnaan alami kepada peserta didik. Kegiatan ini memberi ruang untuk belajar, berekspresi, dan melatih ketekunan.",
      },
      {
        key: "story_2004_p2",
        label: "Paragraf 2",
        kind: "textarea",
        max: 320,
        fallback:
          "Seiring perubahan kemampuan dan karakter anak, teknik jumputan dan shibori ikut diperkenalkan. Cara berkarya disesuaikan dengan kebutuhan peserta didik.",
      },
    ],
  },
];

/** Semua kolom, termasuk teks alt tiap gambar (`${key}_alt`). */
export const blockFields: BlockField[] = blockSections.flatMap((section) =>
  section.fields.flatMap((field) =>
    field.alt ? [field, { key: `${field.key}_alt`, label: "Teks alt", kind: "text" as const, fallback: field.alt, max: 150 }] : [field],
  ),
);

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
