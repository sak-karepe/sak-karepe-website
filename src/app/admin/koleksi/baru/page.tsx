import type { Metadata } from "next";
import { max } from "drizzle-orm";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { AdminBack } from "@/components/admin-back";
import { CategoryForm } from "@/components/category-form";
import { createCategory } from "@/lib/category-actions";

export const metadata: Metadata = { title: "Tambah koleksi" };

export default async function NewCategoryPage() {
  await requireAdminPage();
  const [{ last }] = await db.select({ last: max(categories.sortOrder) }).from(categories);
  const nextSortOrder = (last ?? -1) + 1;

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack href="/admin/koleksi" label="Semua koleksi" />
      <h1 className="mt-4 mb-8 text-3xl tracking-[-.045em] md:text-4xl">Tambah koleksi</h1>
      <CategoryForm action={createCategory} defaultSortOrder={nextSortOrder} />
    </main>
  );
}

