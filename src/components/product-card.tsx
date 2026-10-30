import { LinkIcon } from "@/components/icons";
import Image from "@/components/site-image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/catalog";
import { formatRupiah } from "@/lib/format";
export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.images[0];
  return (
    <article>
      <Link href={`/produk/${product.slug}`} className="group block w-full text-left">
        <div className="photo aspect-[4/5]">
          <Image
            className="object-cover transition-transform duration-500 group-hover:scale-[1.035]"
            src={image.src}
            alt={image.alt}
            fill
            sizes="(max-width: 768px) 45vw, 25vw"
          />
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base leading-snug tracking-[-.025em] md:text-lg">{product.name}</h3>
            <p className="mt-1 text-[13px] leading-snug text-muted">
              {product.categoryTitle} · {product.price === null ? "Konsultasi" : formatRupiah(product.price)}
            </p>
          </div>
          <span className="mt-1.5 text-muted"><LinkIcon /></span>
        </div>
      </Link>
    </article>
  );
}
