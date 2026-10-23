import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { ProductForm } from "@/components/product-form";
import { deleteProduct, updateProduct } from "@/lib/product-actions";
import { AdminBack } from "@/components/admin-back";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr";
import { getCategory } from "@/lib/catalog";
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
  // Galeri koleksi membuka foto ke-N lewat hash #foto-N, jadi cari posisi foto utama produk ini.
  const gallery = product.published ? (await getCategory(product.categorySlug))?.photos ?? [] : [];
  const photoIndex = gallery.findIndex((photo) => photo.src === product.images[0]?.src);
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack />
      <div className="mt-4 mb-8 flex max-w-5xl flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Ubah produk</h1>
        {photoIndex >= 0 ? (
          <Link
            href={`/koleksi/${product.categorySlug}#foto-${photoIndex + 1}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[15px] text-accent hover:underline"
          >
            Lihat di website <ArrowSquareOutIcon size={16} aria-hidden="true" />
          </Link>
        ) : (
          <p className="text-sm text-muted">
            {product.published ? "Tambahkan foto agar produk tampil di website." : "Produk disembunyikan dari website."}
          </p>
        )}
      </div>
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
