"use client";
import { LinkIcon } from "@/components/icons";
import Image from "@/components/site-image";
import { useState } from "react";
import { collectionDetails } from "@/lib/collection-details";
import { products } from "@/lib/content";
import Link from "next/link";
export function Collection({ showAllCategories = false }: { showAllCategories?: boolean }) {
  const [filter, setFilter] = useState("all");
  const choices = (showAllCategories ? products : products.slice(0, 4)).map((product) => ({
    ...product,
    photoIndex: Math.max(0, collectionDetails[product.category].photos.findIndex(
      (photo) => photo.src === product.src,
    )),
  }));
  const visible = choices.filter(p => filter === "all" || p.category === filter);
  return (
    <>
      <div className="mt-8 mb-7 flex items-center justify-between gap-5 border-b border-line">
        <div
          className="flex min-w-0 gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
          role="group"
          aria-label="Filter koleksi"
        >
          {["all", "busana", "tas", "sepatu", "kain", ...(showAllCategories ? ["rumah"] : [])].map((category) => (
            <button
              key={category}
              aria-pressed={filter === category}
              onClick={() => setFilter(category)}
              className={`min-h-12 shrink-0 border-b-2 px-1 py-3 text-base ${filter === category ? "border-accent font-medium text-ink" : "border-transparent text-muted"}`}
            >
              {category === "all"
                ? "Semua"
                : category[0].toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
        <p
          className="hidden whitespace-nowrap text-[13px] text-muted md:block"
          aria-live="polite"
        >
          {visible.length} koleksi
        </p>
      </div>
      <div
        key={filter}
        className="switch-enter grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-5 md:gap-y-10 xl:gap-x-6"
      >
        {visible.map((p) => (
          <article key={p.src}>
            <Link
              href={`/koleksi/${p.category}#foto-${p.photoIndex + 1}`}
              className="group block w-full text-left"
              aria-label={`Lihat ${p.description}`}
            >
              <div
                className="photo aspect-[4/5]"
              >
                <Image
                  className={`object-cover transition-transform duration-500 group-hover:scale-[1.035]`}
                  src={p.src}
                  alt={p.description}
                  fill
                  sizes="(max-width: 768px) 45vw, 25vw"
                />
              </div>
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg tracking-[-.035em] md:text-xl">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-xs leading-snug text-muted md:text-[13px]">
                    {p.subtitle}
                  </p>
                </div>
                <span className="mt-1.5 text-muted"><LinkIcon /></span>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}
