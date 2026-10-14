import { getCategories, getProducts } from "@/lib/catalog";
import { CollectionFilter } from "./collection-filter";
/** Grid produk dengan filter koleksi. `limit` membatasi jumlah kartu, mis. di beranda. */
export async function Collection({ limit }: { limit?: number }) {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const used = categories
    .filter((category) => products.some((product) => product.categorySlug === category.slug))
    .map(({ slug, title }) => ({ slug, title }));
  return <CollectionFilter products={products} categories={used} limit={limit} />;
}
