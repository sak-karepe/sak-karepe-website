import { getCategories, getProducts } from "@/lib/catalog";
import { CollectionFilter } from "./collection-filter";
/** Grid produk dengan filter koleksi. `limit` membatasi jumlah kartu, mis. di beranda. */
export async function Collection({ limit }: { limit?: number }) {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const items = categories.map(({ slug, title }) => ({ slug, title }));
  return <CollectionFilter products={products} categories={items} limit={limit} />;
}
