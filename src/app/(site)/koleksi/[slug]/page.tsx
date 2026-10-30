import { LinkIcon } from "@/components/icons";
import type { Metadata } from "next";
import Image from "@/components/site-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getCategory, getProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
import { Breadcrumb } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { whatsappUrl } from "@/lib/contact";

export async function generateStaticParams() {
  return (await getCategories()).map((category) => ({ slug: category.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  return {
    title: category
      ? `${category.title} ecoprint · Sak Karepe`
      : "Koleksi · Sak Karepe",
    description: category?.description,
  };
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [category, products, categories] = await Promise.all([
    getCategory(slug),
    getProducts(slug),
    getCategories(),
  ]);
  if (!category) notFound();
  return (
    <main id="utama" className="wrap pt-8 md:pt-10">
      <Breadcrumb
        items={[
          { label: "Koleksi", href: "/koleksi" },
          { label: category.title },
        ]}
      />
      <section
        className="mt-8 grid gap-6 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16"
        aria-labelledby="category-title"
      >
        <div className="stagger">
          <h1 id="category-title" className="page-title">
            {category.title}
            <span className="block">ecoprint.</span>
          </h1>
        </div>
        <div className="stagger max-w-[540px]">
          <p className="text-xl">{category.intro}</p>
          <p className="mt-4 text-muted">{category.character}</p>
          <a
            href={whatsappUrl(
              `Halo Sak Karepe, saya tertarik dengan koleksi ${category.title.toLowerCase()} ecoprint. Boleh saya tahu pilihan motif, ukuran, dan harga yang tersedia?`,
            )}
            className="text-link mt-6"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tanyakan koleksi <LinkIcon />
          </a>
        </div>
      </section>
      <section className="mt-8" aria-label={`Produk ${category.title.toLowerCase()}`}>
        <p className="mb-7 text-[13px] text-muted">{products.length} produk</p>
        {products.length ? (
          <div className="stagger grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-5 md:gap-y-10 xl:gap-x-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="py-12 text-muted">Belum ada produk yang ditampilkan di koleksi ini.</p>
        )}
      </section>
      <Reveal>
        <section className="mt-28 md:mt-32">
          <h2 className="mb-8">Koleksi lainnya.</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-5 xl:gap-6">
            {categories
              .filter((c) => c.slug !== slug)
              .slice(0, 4)
              .map((c) => (
                <Link
                  key={c.slug}
                  href={`/koleksi/${c.slug}`}
                  className="group block min-w-0"
                >
                  <div className="photo aspect-[4/5]">
                    <Image
                      src={c.coverImage}
                      alt={c.description}
                      fill
                      sizes="(max-width: 768px) 45vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg md:text-xl">{c.title}</h3>
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
