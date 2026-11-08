import type { MetadataRoute } from "next";
import { asc, desc} from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

export function siteUrl() {
  const value = process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return value.replace(/\/+$/, "");
}

export function buildSitemapEntries({
  baseUrl,
  categories: categoryRows,
  products: productRows,
}: {
  baseUrl: string;
  categories: { slug: string }[];
  products: { slug: string; published: boolean; updatedAt: Date | string | number | null }[];
}): MetadataRoute.Sitemap {
  const publishedProducts = productRows.filter((product) => product.published);
  const newestDate = publishedProducts.reduce<Date | null>((latest, product) => {
    const value = product.updatedAt ? new Date(product.updatedAt) : null;
    if (!value || Number.isNaN(value.getTime())) return latest;
    return !latest || value > latest ? value : latest;
  }, null);

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, lastModified: newestDate ?? new Date() },
    { url: `${baseUrl}/koleksi`, lastModified: newestDate ?? new Date() },
    ...categoryRows.map((category) => ({
      url: `${baseUrl}/koleksi/${category.slug}`,
      lastModified: newestDate ?? new Date(),
    })),
  ];

  const productEntries = publishedProducts.map((product) => ({
    url: `${baseUrl}/produk/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : undefined,
  }));

  return [...staticEntries, ...productEntries];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categoryRows, productRows] = await Promise.all([
    db.select({ slug: categories.slug }).from(categories).orderBy(asc(categories.sortOrder), asc(categories.slug)),
    db
      .select({
        slug: products.slug,
        published: products.published,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .orderBy(desc(products.updatedAt), asc(products.id)),
  ]);

  return buildSitemapEntries({
    baseUrl: siteUrl(),
    categories: categoryRows,
    products: productRows,
  });
}
