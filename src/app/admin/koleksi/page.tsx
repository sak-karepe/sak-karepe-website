import type { Metadata } from "next";
import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { ArrowRightIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "@/components/site-image";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";

export const metadata: Metadata = { title: "Koleksi" };

export default async function AdminCategoriesPage() {
  await requireAdminPage();
  const [rows, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.slug)),
    db.select({ slug: products.categorySlug, total: count() }).from(products).groupBy(products.categorySlug),
  ]);

  const productCountOf = (slug: string) => counts.find((row) => row.slug === slug)?.total ?? 0;

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Koleksi</h1>
          <p className="mt-2 text-muted">{rows.length} koleksi</p>
        </div>
        <Link href="/admin/koleksi/baru" className="btn min-h-11 gap-2 px-4 text-[15px]">
          <PlusIcon size={18} aria-hidden="true" /> Tambah koleksi
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="mt-8 py-16 text-center text-muted">Belum ada koleksi di sini.</p>
      ) : (
        <ul className="mt-8 divide-y divide-line border-t border-line">
          {rows.map((category) => {
            const totalProducts = productCountOf(category.slug);
            return (
              <li
                key={category.slug}
                className="flex flex-wrap items-center justify-between gap-4 py-4 transition-colors hover:bg-surface/60 md:grid md:grid-cols-[minmax(0,1fr)_160px_140px_110px] md:items-center md:px-2"
              >
                <Link
                  href={`/admin/koleksi/${category.slug}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <div className="photo size-14 shrink-0 md:size-16">
                    <Image
                      src={category.coverImage}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium hover:text-accent">{category.title}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {category.subtitle}
                    </p>
                  </div>
                </Link>
                <Link
                  href={`/admin/koleksi/${category.slug}`}
                  className="hidden truncate font-mono text-sm text-muted hover:text-ink md:block"
                >
                  /koleksi/{category.slug}
                </Link>
                <div className="flex items-center gap-3 md:contents">
                  <Link
                    href={`/admin/produk?koleksi=${encodeURIComponent(category.slug)}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline md:text-[15px]"
                  >
                    {totalProducts} produk
                    <ArrowRightIcon size={14} aria-hidden="true" />
                  </Link>
                  <span className="justify-self-end rounded-full bg-surface px-2.5 py-1 text-xs tabular-nums text-muted">
                    Urutan {category.sortOrder}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

