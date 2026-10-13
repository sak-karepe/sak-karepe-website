/**
 * Migrasi data etalase lama (dulu di src/lib/content.ts dan collection-details.ts) ke database.
 * Jalankan sekali setelah `npm run db:migrate`: `npm run db:seed`. Tidak melakukan apa pun bila
 * kategori sudah terisi, jadi aman dijalankan ulang.
 */
import { runwayPhotos } from "../lib/content";
import { productImage } from "../lib/assets";
import { db } from "./index";
import { categories, productImages, products } from "./schema";

type Photo = { src: string; alt: string };
const legacy: (Omit<typeof categories.$inferInsert, "sortOrder"> & { photos: Photo[] })[] = [
  {
    slug: "busana",
    title: "Busana",
    subtitle: "Ecoprint bertemu batik",
    coverImage: "/images/runway/a9d6a262-62d5-4a55-bf3d-49cf616cf917.jpeg",
    description:
      "Koleksi busana Sak Karepe mempertemukan ecoprint dengan batik. Foto ini menampilkan salah satu busana di panggung fashion.",
    intro: "Ecoprint bertemu batik dan tenun.",
    character:
      "Koleksi busana mempertemukan motif daun dengan unsur batik, tenun ikat, dan lurik. Foto panggung memperlihatkan sebagian ragam karya Sak Karepe.",
    photos: [
      ...runwayPhotos,
      { src: productImage("e3934808-8be2-4305-bd7a-e22e08501ee8"), alt: "Busana panjang bermotif ecoprint dalam pameran" },
    ],
  },
  {
    slug: "tas",
    title: "Tas",
    subtitle: "Jejak daun untuk keseharian",
    coverImage: productImage("4568830f-1ef5-4a13-818b-333ebe618d49"),
    description: "Tote bag dengan motif jejak daun hijau dan kuning pada kain berwarna terang.",
    intro: "Jejak daun yang ikut ke mana pun kamu pergi.",
    character:
      "Dari tote bag berbahan kain hingga tas dengan unsur anyaman, ecoprint memberi karakter berbeda pada setiap bentuk.",
    photos: [
      { src: productImage("4568830f-1ef5-4a13-818b-333ebe618d49"), alt: "Tote bag dengan jejak daun hijau dan kuning" },
      { src: productImage("998116ca-fc67-47d7-b96e-c1e5f22205fe"), alt: "Tas anyaman dengan panel ecoprint cokelat" },
      { src: productImage("193084ac-ee0b-4741-8f53-18729d7bce92"), alt: "Tote bag dengan susunan daun bernuansa cokelat" },
      { src: productImage("41b579e7-e0b6-40fa-83f1-1c8b20a08637"), alt: "Tas kecil dengan panel motif daun" },
      { src: productImage("fc3b844f-0fc0-4c90-af3d-95bb151e254b"), alt: "Tas kain dengan motif daun gelap" },
      { src: productImage("be65b46f-5521-4ef3-82b7-4d1446a7bff1"), alt: "Tas kain bermotif daun kuning dan cokelat" },
    ],
  },
  {
    slug: "sepatu",
    title: "Sepatu",
    subtitle: "Motif dalam setiap langkah",
    coverImage: productImage("4a8c0d65-a166-4e34-9844-3b682a3f7878"),
    description: "Sepatu slip-on dengan motif urat daun hitam dan putih.",
    intro: "Motif daun, dalam setiap langkah.",
    character:
      "Sepatu slip-on ini menampilkan motif urat daun hitam dan putih. Pola alami memberi detail pada bentuk sepatu sehari-hari.",
    photos: [
      { src: productImage("4a8c0d65-a166-4e34-9844-3b682a3f7878"), alt: "Sepasang sepatu slip-on ecoprint bermotif urat daun" },
    ],
  },
  {
    slug: "kain",
    title: "Kain",
    subtitle: "Warna dan bentuk dari alam",
    coverImage: productImage("8804e501-4559-4aa9-9848-df5476f1c64d"),
    description: "Kain bermotif daun hijau dan ungu dengan tepi lurik bergaris.",
    intro: "Satu bentang kain. Banyak kemungkinan.",
    character:
      "Bentuk daun dan warna alami bertemu pada kain. Beberapa karya dipadukan dengan tepi lurik bergaris.",
    photos: [
      { src: productImage("8804e501-4559-4aa9-9848-df5476f1c64d"), alt: "Kain bermotif daun hijau dan ungu dengan tepi lurik" },
      { src: productImage("3ff6a2dc-af7f-47d0-8014-986368cfbe6c"), alt: "Ragam kain bermotif daun dengan tepi bergaris" },
      { src: productImage("9b044280-5a93-412f-88b7-6f7b46af14ea"), alt: "Kain terang dengan jejak daun gelap" },
    ],
  },
  {
    slug: "rumah",
    title: "Rumah",
    subtitle: "Daun dalam keseharian",
    coverImage: productImage("c262c573-badf-4f69-a5ba-68ec232fdfbb"),
    description: "Ragam cangkir dengan motif daun bernuansa cokelat.",
    intro: "Jejak daun di sudut rumah.",
    character: "Ragam cangkir bermotif daun melengkapi koleksi Sak Karepe.",
    photos: [
      { src: productImage("c262c573-badf-4f69-a5ba-68ec232fdfbb"), alt: "Cangkir dengan motif daun bernuansa cokelat" },
      { src: productImage("5a73e497-8ba2-4ca8-a99a-95750b9f204b"), alt: "Ragam cangkir dengan motif daun" },
    ],
  },
];

async function seed() {
  if (await db.$count(categories)) {
    console.log("Kategori sudah ada, seed dilewati.");
    return;
  }
  await db.transaction(async (tx) => {
    for (const [order, { photos, ...category }] of legacy.entries()) {
      await tx.insert(categories).values({ ...category, sortOrder: order });
      // Setiap foto lama menjadi satu produk; nama diambil dari deskripsi foto dan bisa diubah di admin.
      for (const [index, photo] of photos.entries()) {
        const [product] = await tx
          .insert(products)
          .values({ categorySlug: category.slug, name: photo.alt, sortOrder: index })
          .returning({ id: products.id });
        await tx.insert(productImages).values({ productId: product.id, src: photo.src, alt: photo.alt });
      }
    }
  });
  console.log(`Seed selesai: ${legacy.length} kategori, ${legacy.reduce((n, c) => n + c.photos.length, 0)} produk.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
