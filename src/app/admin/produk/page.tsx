import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, eq, like, or } from "drizzle-orm";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import { ProductsSearch } from "@/components/products-search";
import Image from "@/components/site-image";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Produk" };

const PER_PAGE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ koleksi?: string; q?: string; page?: string }>;
}) {
  await requireAdminPage();
  const { koleksi: rawKoleksi, q: rawQ, page: rawPage } = await searchParams;
  const q = (typeof rawQ === "string" ? rawQ : "").trim().slice(0, 80);
  const koleksiParam = typeof rawKoleksi === "string" ? rawKoleksi.trim() : "";

  const search = q ? or(like(products.name, `%${q}%`), like(products.slug, `%${q}%`)) : undefined;

  const [allCategories, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select({ slug: products.categorySlug, total: count() }).from(products).where(search).groupBy(products.categorySlug),
  ]);

  const activeCategory = allCategories.find((category) => category.slug === koleksiParam);
  const koleksi = activeCategory?.slug;

  const countOf = (slug?: string) =>
    counts.filter((row) => !slug || row.slug === slug).reduce((sum, row) => sum + row.total, 0);

  const total = countOf(koleksi);
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const parsedPage = Number(rawPage);
  const page = Number.isInteger(parsedPage) && parsedPage > 1 ? Math.min(parsedPage, totalPages) : 1;

  const rows = await db.query.products.findMany({
    where: and(koleksi ? eq(products.categorySlug, koleksi) : undefined, search),
    orderBy: [asc(products.categorySlug), asc(products.sortOrder), asc(products.id)],
    limit: PER_PAGE,
    offset: (page - 1) * PER_PAGE,
    with: { images: { orderBy: (image, { asc }) => [asc(image.sortOrder), asc(image.id)], limit: 1 } },
  });

  const categoryTitle = (slug: string) => allCategories.find((category) => category.slug === slug)?.title ?? slug;

  const tabHref = (slug?: string) => {
    const params = new URLSearchParams({ ...(slug && { koleksi: slug }), ...(q && { q }) });
    return params.size ? `/admin/produk?${params}` : "/admin/produk";
  };

  const pageHref = (targetPage: number) => {
    const params = new URLSearchParams({
      ...(koleksi && { koleksi }),
      ...(q && { q }),
      ...(targetPage > 1 && { page: String(targetPage) }),
    });
    return params.size ? `/admin/produk?${params}` : "/admin/produk";
  };

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Produk</h1>
          <p className="mt-2 text-muted">
            {total} produk{activeCategory && ` di koleksi ${activeCategory.title}`}
            {q && ` untuk "${q}"`}
          </p>
        </div>
        <Link href="/admin/produk/baru" className="btn min-h-11 gap-2 px-4 text-[15px]">
          <PlusIcon size={18} aria-hidden="true" /> Tambah produk
        </Link>
      </div>

      <ProductsSearch initialQ={q} koleksi={koleksi ?? ""} />

      <nav aria-label="Filter koleksi" className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
        {[{ slug: undefined, title: "Semua" }, ...allCategories].map((category) => {
          const active = koleksi === category.slug;
          return (
            <Link
              key={category.title}
              href={tabHref(category.slug)}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-[15px] ${active ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"}`}
            >
              {category.title}
              <span className="text-xs tabular-nums text-muted">{countOf(category.slug)}</span>
            </Link>
          );
        })}
      </nav>
      {rows.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted">
            {q
              ? `Tidak ada produk dengan nama atau slug "${q}"${activeCategory ? ` di koleksi ${activeCategory.title}` : ""}.`
              : "Belum ada produk di sini."}
          </p>
          {(q || koleksi) && (
            <Link
              href={q && koleksi ? tabHref(koleksi) : "/admin/produk"}
              className="mt-4 inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm transition-colors hover:border-accent hover:text-accent"
            >
              {q && koleksi ? "Reset pencarian" : "Reset filter"}
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line">
            {rows.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/admin/produk/${product.id}`}
                  className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 py-4 transition-colors hover:bg-surface/60 md:grid-cols-[64px_minmax(0,1fr)_140px_120px_110px] md:px-2"
                >
                  <div className="photo size-14 md:size-16">
                    {product.images[0] && (
                      <Image src={product.images[0].src} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {categoryTitle(product.categorySlug)}
                      <span className="md:hidden"> · {product.price === null ? "Konsultasi" : formatRupiah(product.price)}</span>
                    </p>
                  </div>
                  <p className="hidden text-[15px] md:block">
                    {product.price === null ? <span className="text-muted">Konsultasi</span> : formatRupiah(product.price)}
                  </p>
                  <p className={`hidden text-[15px] md:block ${product.stock === 0 ? "text-danger" : "text-muted"}`}>
                    {product.stock === null ? "Stok tak terbatas" : product.stock === 0 ? "Stok habis" : `Stok ${product.stock}`}
                  </p>
                  {/* Stok 0 ikut disembunyikan dari toko (lib/catalog). */}
                  <span
                    className={`justify-self-end rounded-full px-2.5 py-1 text-xs ${!product.published ? "border border-line text-muted" : product.stock === 0 ? "border border-danger text-danger" : "bg-surface text-accent"}`}
                  >
                    {!product.published ? "Disembunyikan" : product.stock === 0 ? "Habis" : "Tampil"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {totalPages > 1 && (
            <nav aria-label="Navigasi halaman" className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <p className="text-sm text-muted">
                Halaman <span className="font-medium text-ink tabular-nums">{page}</span> dari{" "}
                <span className="font-medium text-ink tabular-nums">{totalPages}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {page > 1 && (
                  <Link
                    href={pageHref(page - 1)}
                    className="inline-flex min-h-11 items-center rounded-md border border-line px-3.5 text-sm transition-colors hover:border-accent hover:text-accent"
                  >
                    Sebelumnya
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNum) => {
                  const active = pageNum === page;
                  return (
                    <Link
                      key={pageNum}
                      href={pageHref(pageNum)}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm tabular-nums transition-colors ${
                        active
                          ? "border-accent bg-accent font-medium text-button-ink"
                          : "border-line hover:border-accent hover:text-accent"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                })}
                {page < totalPages && (
                  <Link
                    href={pageHref(page + 1)}
                    className="inline-flex min-h-11 items-center rounded-md border border-line px-3.5 text-sm transition-colors hover:border-accent hover:text-accent"
                  >
                    Berikutnya
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
