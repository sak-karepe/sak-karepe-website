import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

export type Photo = { src: string; alt: string };
export type CatalogProduct = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number | null;
  stock: number | null;
  categorySlug: string;
  categoryTitle: string;
  images: Photo[];
};

export function getCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

export async function getCategory(slug: string) {
  return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
}

/** Produk yang ditampilkan, punya foto, dan stoknya belum habis (stok kosong = tidak dibatasi), urut sesuai koleksi lalu urutan produk. */
export async function getProducts(categorySlug?: string): Promise<CatalogProduct[]> {
  const rows = await db.query.products.findMany({
    where: and(eq(products.published, true), categorySlug ? eq(products.categorySlug, categorySlug) : undefined),
    orderBy: [asc(products.sortOrder), asc(products.id)],
    with: {
      category: { columns: { title: true, sortOrder: true } },
      images: { columns: { src: true, alt: true }, orderBy: (image, { asc }) => [asc(image.sortOrder), asc(image.id)] },
    },
  });
  return rows
    .filter((row) => row.images.length > 0 && row.stock !== 0)
    .sort((a, b) => a.category.sortOrder - b.category.sortOrder)
    .map(({ category, ...row }) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      price: row.price,
      stock: row.stock,
      categorySlug: row.categorySlug,
      categoryTitle: category.title,
      images: row.images,
    }));
}

export async function getProduct(slug: string) {
  return (await getProducts()).find((product) => product.slug === slug);
}
