import { LinkIcon } from "@/components/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategory, getProduct, getProducts } from "@/lib/catalog";
import { formatRupiah } from "@/lib/format";
import { ProductPhotos } from "@/components/product-photos";
import { ProductCard } from "@/components/product-card";
import { Breadcrumb } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { whatsappUrl } from "@/lib/contact";
import { BuyButton } from "@/components/buy-button";

export async function generateStaticParams() {
  return (await getProducts()).map((product) => ({ slug: product.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return {
    title: product ? `${product.name} · Sak Karepe` : "Produk · Sak Karepe",
    description: product?.description || product?.images[0].alt,
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const [category, products] = await Promise.all([getCategory(product.categorySlug), getProducts()]);
  const others = products.filter((p) => p.id !== product.id);
  // Utamakan produk dari koleksi yang sama, lalu lengkapi dari koleksi lain.
  const related = [
    ...others.filter((p) => p.categorySlug === product.categorySlug),
    ...others.filter((p) => p.categorySlug !== product.categorySlug),
  ].slice(0, 4);
  return (
    <main id="utama" className="wrap pt-8 md:pt-10">
      <Breadcrumb
        items={[
          { label: "Koleksi", href: "/koleksi" },
          { label: product.categoryTitle, href: `/koleksi/${product.categorySlug}` },
          { label: product.name },
        ]}
      />
      <section
        className="mt-8 grid items-start gap-9 md:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] md:gap-12 xl:gap-20"
        aria-labelledby="product-title"
      >
        <ProductPhotos
          key={product.id}
          title={product.name}
          featuredSrc={product.images[0].src}
          photos={product.images}
        />
        <div className="min-w-0 md:sticky md:top-28 md:pt-9">
          <Link href={`/koleksi/${product.categorySlug}`} className="text-sm text-accent hover:underline">
            Koleksi {product.categoryTitle.toLowerCase()}
          </Link>
          <h1 id="product-title" className="mt-4 text-[34px] leading-[1.1] tracking-[-.05em] md:text-[44px]">
            {product.name}
          </h1>
          <p className="mt-5 text-xl">
            {product.price === null ? "Harga melalui konsultasi" : formatRupiah(product.price)}
          </p>
          {product.stock !== null && (
            <p className="mt-1 text-sm text-muted">
              {product.stock > 0 ? `Stok ${product.stock}` : "Stok sedang kosong, tanyakan untuk pesanan berikutnya"}
            </p>
          )}
          {product.description && <p className="mt-6 whitespace-pre-line">{product.description}</p>}
          {category && <p className="mt-5 text-muted">{category.character}</p>}
          <div className="mt-8 border-t border-line pt-6">
            <p className="text-sm text-muted">
              Ukuran, pilihan material, dan ketersediaan dibicarakan bersama sebelum memesan. Motif ecoprint
              dapat sedikit berbeda di setiap karya.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
              <BuyButton
                slug={product.slug}
                product={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  stock: product.stock,
                  image: product.images[0],
                }}
              />
              <a
                href={whatsappUrl(
                  `Halo Sak Karepe, saya tertarik dengan produk "${product.name}". Boleh saya tahu ukuran, motif, dan harga yang tersedia?`,
                )}
                className={product.stock === 0 ? "btn" : "text-link"}
                target="_blank"
                rel="noopener noreferrer"
              >
                Tanyakan produk ini <LinkIcon />
              </a>
            </div>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <Reveal>
          <section className="mt-16 border-t border-line pt-10 md:mt-24">
            <h2 className="mb-8">Pilihan lainnya.</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-5 xl:gap-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        </Reveal>
      )}
    </main>
  );
}
