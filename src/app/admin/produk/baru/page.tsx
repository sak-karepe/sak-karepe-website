import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { ProductForm } from "@/components/product-form";
import { createProduct } from "@/lib/product-actions";
import { AdminBack } from "@/components/admin-back";
export const metadata: Metadata = { title: "Tambah produk" };
export default async function NewProductPage() {
  await requireAdminPage();
  const options = await db
    .select({ slug: categories.slug, title: categories.title })
    .from(categories)
    .orderBy(asc(categories.sortOrder));
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack />
      <h1 className="mt-4 mb-8 text-3xl tracking-[-.045em] md:text-4xl">Tambah produk</h1>
      <ProductForm action={createProduct} categories={options} />
    </main>
  );
}
