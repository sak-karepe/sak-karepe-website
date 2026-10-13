import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, productImages, products, type Category } from "@/db/schema";

export type Photo = { src: string; alt: string };
export type CatalogCategory = Category & { photos: Photo[] };

/** Kategori beserta galeri foto dari semua produk yang ditampilkan, sesuai urutan produk. */
export async function getCatalog(): Promise<CatalogCategory[]> {
  const [rows, photos] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db
      .select({ categorySlug: products.categorySlug, src: productImages.src, alt: productImages.alt })
      .from(productImages)
      .innerJoin(products, eq(productImages.productId, products.id))
      .where(eq(products.published, true))
      .orderBy(asc(products.sortOrder), asc(products.id), asc(productImages.sortOrder), asc(productImages.id)),
  ]);
  return rows.map((category) => ({
    ...category,
    photos: photos
      .filter((photo) => photo.categorySlug === category.slug)
      .map(({ src, alt }) => ({ src, alt })),
  }));
}

export async function getCategory(slug: string) {
  return (await getCatalog()).find((category) => category.slug === slug);
}
