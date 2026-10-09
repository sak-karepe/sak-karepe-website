"use client";
import { ExpandIcon } from "@/components/icons";
import Image from "@/components/site-image";
import { useState, useSyncExternalStore } from "react";
import type { Product } from "@/lib/content";
import type { CollectionDetail } from "@/lib/collection-details";
import { useSite } from "./site-shell";
export function ProductPhotos({
  product,
  photos,
}: {
  product: Product;
  photos: CollectionDetail["photos"];
}) {
  const hash = useSyncExternalStore(
    (notify) => {
      window.addEventListener("hashchange", notify);
      return () => window.removeEventListener("hashchange", notify);
    },
    () => window.location.hash,
    () => "",
  );
  const [chosen, setSelected] = useState<number | null>(null);
  const requested = Number(hash.replace("#foto-", "")) - 1;
  const featured = Math.max(0, photos.findIndex((photo) => photo.src === product.src));
  const selected = chosen ?? (requested >= 0 && requested < photos.length ? requested : featured);
  const { open } = useSite();
  const image = photos[selected];
  return (
    <div className="min-w-0 w-full max-w-full">
      <button
        className="group photo relative block h-[450px] w-full md:h-[620px]"
        aria-label={`Perbesar foto ${product.title.toLowerCase()}`}
        onClick={() =>
          open({
            kind: "product",
            product: { ...product, src: image.src, description: image.alt },
          })
        }
      >
        <Image
          key={image.src}
          src={image.src}
          alt={image.alt}
          fill
          preload={selected === 0}
          sizes="(max-width: 768px) 90vw, 55vw"
          className="switch-enter object-contain"
        />
        <span className="absolute right-4 bottom-4 inline-flex items-center gap-2 rounded-md bg-page px-3 py-2 text-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          Perbesar <ExpandIcon />
        </span>
      </button>
      {photos.length > 1 && (
        <div
          className="mt-4 flex w-full max-w-full min-w-0 gap-3 overflow-x-auto pb-2"
          role="group"
          aria-label="Pilih foto koleksi"
        >
          {photos.map((photo, index) => (
            <button
              key={photo.src}
              aria-label={`Lihat foto ${index + 1}`}
              aria-pressed={selected === index}
              onClick={() => setSelected(index)}
              className={`photo relative h-24 w-20 shrink-0 border-2 ${selected === index ? "border-accent" : "border-transparent"}`}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
