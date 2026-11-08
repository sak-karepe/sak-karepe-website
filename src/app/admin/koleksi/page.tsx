import type { Metadata } from "next";
import Link from "next/link";
import { asc, count } from "drizzle-orm";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr";
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
              <li key={category.slug}>
                <Link
                  href={`/admin/koleksi/${category.slug}`}
                  className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 py-4 transition-colors hover:bg-surface/60 md:grid-cols-[64px_minmax(0,1fr)_160px_130px_110px] md:px-2"
                >
                  <div className="photo size-14 md:size-16">
                    <Image
                      src={category.coverImage}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{category.title}</p>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {category.subtitle}
                      <span className="md:hidden"> · {totalProducts} produk</span>
                    </p>
                  </div>
                  <p className="hidden truncate font-mono text-sm text-muted md:block">
                    /koleksi/{category.slug}
                  </p>
                  <p className="hidden text-[15px] text-muted md:block">
                    {totalProducts} produk
                  </p>
                  <span className="justify-self-end rounded-full bg-surface px-2.5 py-1 text-xs tabular-nums text-muted">
                    Urutan {category.sortOrder}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

