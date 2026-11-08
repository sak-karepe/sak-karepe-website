import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { AdminBack } from "@/components/admin-back";
import { CategoryForm } from "@/components/category-form";
import { deleteCategory, updateCategory } from "@/lib/category-actions";

export const metadata: Metadata = { title: "Ubah koleksi" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requireAdminPage();
  const { slug } = await params;

  const [category, productCount] = await Promise.all([
    db.query.categories.findFirst({ where: eq(categories.slug, slug) }),
    db.$count(products, eq(products.categorySlug, slug)),
  ]);

  if (!category) notFound();

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack href="/admin/koleksi" label="Semua koleksi" />
      <div className="mt-4 mb-8 flex max-w-5xl flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Ubah koleksi</h1>
          <p className="mt-2 text-sm text-muted">
            {productCount} produk di dalam koleksi ini
          </p>
        </div>
        <Link
          href={`/koleksi/${category.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[15px] text-accent hover:underline"
        >
          Lihat di website <ArrowSquareOutIcon size={16} aria-hidden="true" />
        </Link>
      </div>
      <CategoryForm
        action={updateCategory.bind(null, category.slug)}
        onDelete={deleteCategory.bind(null, category.slug)}
        category={category}
        productCount={productCount}
      />
    </main>
  );
}

