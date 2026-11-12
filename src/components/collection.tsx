import { getCategories, getProducts } from "@/lib/catalog";
import { CollectionFilter } from "./collection-filter";
/** Grid produk dengan filter koleksi. `limit` membatasi jumlah kartu, mis. di beranda. */
export async function Collection({
  limit,
  initialQ = "",
  initialKoleksi = "",
}: {
  limit?: number;
  initialQ?: string;
  initialKoleksi?: string;
}) {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const items = categories.map(({ slug, title }) => ({ slug, title }));
  const validKoleksi = items.some((item) => item.slug === initialKoleksi) ? initialKoleksi : "all";
  return (
    <CollectionFilter
      products={products}
      categories={items}
      limit={limit}
      initialQ={initialQ}
      initialKoleksi={validKoleksi}
    />
  );
}
