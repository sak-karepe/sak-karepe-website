import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "@/components/site-image";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { formatRupiah } from "@/lib/format";
export const metadata: Metadata = { title: "Produk" };
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ koleksi?: string }>;
}) {
  await requireAdminPage();
  const { koleksi } = await searchParams;
  const [allCategories, rows] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder)),
    db.query.products.findMany({
      where: koleksi ? eq(products.categorySlug, koleksi) : undefined,
      orderBy: [asc(products.categorySlug), asc(products.sortOrder), asc(products.id)],
      with: { images: { orderBy: (image, { asc }) => [asc(image.sortOrder), asc(image.id)], limit: 1 } },
    }),
  ]);
  const categoryTitle = (slug: string) => allCategories.find((category) => category.slug === slug)?.title ?? slug;
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Produk</h1>
          <p className="mt-2 text-muted">{rows.length} produk{koleksi && ` di koleksi ${categoryTitle(koleksi)}`}</p>
        </div>
        <Link href="/admin/produk/baru" className="btn min-h-11 gap-2 px-4 text-[15px]">
          <PlusIcon size={18} aria-hidden="true" /> Tambah produk
        </Link>
      </div>
      <nav aria-label="Filter koleksi" className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
        {[{ slug: undefined, title: "Semua" }, ...allCategories].map((category) => {
          const active = koleksi === category.slug;
          return (
            <Link
              key={category.title}
              href={category.slug ? `/admin/produk?koleksi=${category.slug}` : "/admin/produk"}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-1 py-3 text-[15px] ${active ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"}`}
            >
              {category.title}
            </Link>
          );
        })}
      </nav>
      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted">Belum ada produk di sini.</p>
      ) : (
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
                <p className="hidden text-[15px] text-muted md:block">
                  {product.stock === null ? "Stok —" : `Stok ${product.stock}`}
                </p>
                <span
                  className={`justify-self-end rounded-full px-2.5 py-1 text-xs ${product.published ? "bg-surface text-accent" : "border border-line text-muted"}`}
                >
                  {product.published ? "Tampil" : "Disembunyikan"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
