import { LinkIcon } from "@/components/icons";
import type { Metadata } from "next";
import Image from "@/components/site-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "@/lib/content";
import { collectionDetails } from "@/lib/collection-details";
import { ProductPhotos } from "@/components/product-photos";
import { Breadcrumb } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { whatsappUrl } from "@/lib/contact";
export const dynamicParams = false;

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.category }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((p) => p.category === slug);
  return {
    title: product
      ? `${product.title} ecoprint · Sak Karepe`
      : "Koleksi · Sak Karepe",
    description: product?.description,
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((p) => p.category === slug);
  if (!product) notFound();
  const detail = collectionDetails[slug];
  return (
    <main id="utama" className="wrap pt-8 md:pt-10">
      <Breadcrumb
        items={[
          { label: "Koleksi", href: "/koleksi" },
          { label: product.title },
        ]}
      />
      <section
        className="mt-8 grid items-start gap-9 md:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] md:gap-12 xl:gap-20"
        aria-labelledby="product-title"
      >
        <ProductPhotos
          key={product.category}
          product={product}
          photos={detail.photos}
        />
        <div className="min-w-0 md:sticky md:top-28 md:pt-9">
          <p className="text-sm text-accent">Koleksi ecoprint</p>
          <h1 id="product-title" className="page-title mt-4">
            {product.title}
            <span className="block text-accent">Sak Karepe.</span>
          </h1>
          <p className="mt-6 text-xl">{detail.intro}</p>
          <p className="mt-5 text-muted">{detail.character}</p>
          <div className="mt-8 border-t border-line pt-6">
            <p className="text-sm text-muted">
              Harga, ukuran, pilihan material, serta ketersediaan dibicarakan
              bersama sebelum memesan.
            </p>
            <a
              href={whatsappUrl(
                `Halo Sak Karepe, saya tertarik dengan koleksi ${product.title.toLowerCase()} ecoprint. Boleh saya tahu pilihan motif, ukuran, dan harga yang tersedia?`,
              )}
              className="btn mt-6"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tanyakan koleksi <LinkIcon />
            </a>
          </div>
        </div>
      </section>
      <Reveal>
        <section className="mt-16 grid gap-6 border-t border-line py-10 md:mt-24 md:grid-cols-[.8fr_1.2fr] md:gap-16">
          <h2 className="text-[32px] md:text-[40px]">
            Setiap jejak
            <br />
            punya karakter.
          </h2>
          <div className="max-w-[540px] text-muted">
            <p>
              Daun dan bunga menjadi sumber motif dan warna. Hasil setiap proses
              dapat berbeda, sehingga motif pada foto tidak selalu dapat diulang
              persis sama.
            </p>
            {detail.photos.length > 1 && (
              <p className="mt-4 text-sm">
                Foto menampilkan beberapa karya dalam koleksi{" "}
                {product.title.toLowerCase()}, masing-masing dengan motif dan
                bentuknya sendiri.
              </p>
            )}
          </div>
        </section>
      </Reveal>
      <Reveal>
        <section className="mt-6 md:mt-12">
          <h2 className="mb-8">Pilihan lainnya.</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-5 xl:gap-6">
            {products
              .filter((p) => p.category !== slug)
              .slice(0, 4)
              .map((p) => (
                <Link
                  key={p.category}
                  href={`/koleksi/${p.category}`}
                  className="group block min-w-0"
                >
                  <div className="photo aspect-[4/5]">
                    <Image
                      src={p.src}
                      alt={p.description}
                      fill
                      sizes="(max-width: 768px) 45vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl">{p.title}</h3>
                    <LinkIcon />
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
