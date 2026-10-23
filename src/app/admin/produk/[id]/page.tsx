import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { ProductForm } from "@/components/product-form";
import { deleteProduct, updateProduct } from "@/lib/product-actions";
import { AdminBack } from "@/components/admin-back";
export const metadata: Metadata = { title: "Ubah produk" };
export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [options, product] = await Promise.all([
    db.select({ slug: categories.slug, title: categories.title }).from(categories).orderBy(asc(categories.sortOrder)),
    db.query.products.findFirst({
      where: eq(products.id, id),
      with: { images: { orderBy: (image, { asc }) => [asc(image.sortOrder), asc(image.id)] } },
    }),
  ]);
  if (!product) notFound();
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack />
      <h1 className="mt-4 mb-8 text-3xl tracking-[-.045em] md:text-4xl">Ubah produk</h1>
      <ProductForm
        action={updateProduct.bind(null, id)}
        onDelete={deleteProduct.bind(null, id)}
        categories={options}
        product={{
          ...product,
          images: product.images.map(({ id, src, alt }) => ({ id, src, alt })),
        }}
      />
    </main>
  );
}
