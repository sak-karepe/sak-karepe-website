import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import {
  PlusIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import Image from "@/components/site-image";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { formatRupiah } from "@/lib/format";

export const metadata: Metadata = { title: "Produk" };

const PRODUCTS_PER_PAGE = 15;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ koleksi?: string; page?: string }>;
}) {
  await requireAdminPage();
  const { koleksi, page: pageParam } = await searchParams;

  const currentPage = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const offset = (currentPage - 1) * PRODUCTS_PER_PAGE;

  const whereClause = koleksi ? eq(products.categorySlug, koleksi) : undefined;

  // Ambil kategori, total count produk terfilter, dan data rows dengan limit/offset secara paralel
  const [allCategories, totalResult, rows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.select({ total: count() }).from(products).where(whereClause),
    db.query.products.findMany({
      where: whereClause,
      orderBy: [
        asc(products.categorySlug),
        asc(products.sortOrder),
        asc(products.id),
      ],
      limit: PRODUCTS_PER_PAGE,
      offset: offset,
      with: {
        images: {
          orderBy: (image, { asc }) => [asc(image.sortOrder), asc(image.id)],
          limit: 1,
        },
      },
    }),
  ]);

  const totalProducts = totalResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE);

  const categoryTitle = (slug: string) =>
    allCategories.find((category) => category.slug === slug)?.title ?? slug;

  // Helper untuk membuat URL kategori dengan mereset halaman ke 1
  const categoryHref = (slug?: string) => {
    const params = new URLSearchParams();
    if (slug) params.set("koleksi", slug);
    return params.size ? `/admin/produk?${params}` : "/admin/produk";
  };

  // Helper untuk membuat URL pagination dengan mempertahankan filter koleksi yang aktif
  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (koleksi) params.set("koleksi", koleksi);
    if (pageNumber > 1) params.set("page", String(pageNumber));
    return params.size ? `/admin/produk?${params}` : "/admin/produk";
  };

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Produk</h1>
          <p className="mt-2 text-muted">
            {totalProducts} produk
            {koleksi && ` di koleksi ${categoryTitle(koleksi)}`}
          </p>
        </div>
        <Link
          href="/admin/produk/baru"
          className="btn min-h-11 gap-2 px-4 text-[15px]"
        >
          <PlusIcon size={18} aria-hidden="true" /> Tambah produk
        </Link>
      </div>

      <nav
        aria-label="Filter koleksi"
        className="mt-8 flex gap-6 overflow-x-auto border-b border-line"
      >
        {[{ slug: undefined, title: "Semua" }, ...allCategories].map(
          (category) => {
            const active = koleksi === category.slug;
            return (
              <Link
                key={category.title}
                href={categoryHref(category.slug)}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 border-b-2 px-1 py-3 text-[15px] ${active ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"}`}
              >
                {category.title}
              </Link>
            );
          },
        )}
      </nav>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted">
          Belum ada produk di sini.
        </p>
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
                      <Image
                        src={product.images[0].src}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="mt-0.5 text-sm text-muted">
                      {categoryTitle(product.categorySlug)}
                      <span className="md:hidden">
                        {" "}
                        ·{" "}
                        {product.price === null
                          ? "Konsultasi"
                          : formatRupiah(product.price)}
                      </span>
                    </p>
                  </div>
                  <p className="hidden text-[15px] md:block">
                    {product.price === null ? (
                      <span className="text-muted">Konsultasi</span>
                    ) : (
                      formatRupiah(product.price)
                    )}
                  </p>
                  <p
                    className={`hidden text-[15px] md:block ${product.stock === 0 ? "text-danger" : "text-muted"}`}
                  >
                    {product.stock === null
                      ? "Stok tak terbatas"
                      : product.stock === 0
                        ? "Stok habis"
                        : `Stok ${product.stock}`}
                  </p>
                  {/* Stok 0 ikut disembunyikan dari toko (lib/catalog). */}
                  <span
                    className={`justify-self-end rounded-full px-2.5 py-1 text-xs ${!product.published ? "border border-line text-muted" : product.stock === 0 ? "border border-danger text-danger" : "bg-surface text-accent"}`}
                  >
                    {!product.published
                      ? "Disembunyikan"
                      : product.stock === 0
                        ? "Habis"
                        : "Tampil"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Server-Side Pagination Navigasi */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-line px-2">
              <p className="text-sm text-muted">
                Halaman {currentPage} dari {totalPages} (Total {totalProducts}{" "}
                produk)
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={createPageUrl(currentPage - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-line hover:border-accent hover:text-accent transition-colors"
                  >
                    <CaretLeftIcon size={16} /> Sebelumnya
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-line opacity-50 cursor-not-allowed">
                    <CaretLeftIcon size={16} /> Sebelumnya
                  </span>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={createPageUrl(currentPage + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-line hover:border-accent hover:text-accent transition-colors"
                  >
                    Selanjutnya <CaretRightIcon size={16} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-line opacity-50 cursor-not-allowed">
                    Selanjutnya <CaretRightIcon size={16} />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
