import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/catalog";
import { siteUrl } from "@/lib/assets";

/** Hanya halaman yang benar-benar tampil: produk mengikuti getProducts (tampil, punya foto, stok belum habis). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  return [
    { url: `${siteUrl}/` },
    { url: `${siteUrl}/koleksi` },
    ...categories.map((category) => ({ url: `${siteUrl}/koleksi/${category.slug}` })),
    ...products.map((product) => ({ url: `${siteUrl}/produk/${product.slug}` })),
  ];
}
