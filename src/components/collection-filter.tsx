"use client";
import { useState } from "react";
import type { CatalogProduct } from "@/lib/catalog";
import { ProductCard } from "./product-card";
export function CollectionFilter({
  products,
  categories,
  limit,
}: {
  products: CatalogProduct[];
  categories: { slug: string; title: string }[];
  limit?: number;
}) {
  const [filter, setFilter] = useState("all");
  const matching = products.filter((p) => filter === "all" || p.categorySlug === filter);
  const visible = limit ? matching.slice(0, limit) : matching;
  return (
    <>
      <div className="mt-8 mb-7 flex items-center justify-between gap-5 border-b border-line">
        <div
          className="flex min-w-0 gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
          role="group"
          aria-label="Filter koleksi"
        >
          {[{ slug: "all", title: "Semua" }, ...categories].map((category) => (
            <button
              key={category.slug}
              aria-pressed={filter === category.slug}
              onClick={() => setFilter(category.slug)}
              className={`min-h-12 shrink-0 border-b-2 px-1 py-3 text-base ${filter === category.slug ? "border-accent font-medium text-ink" : "border-transparent text-muted"}`}
            >
              {category.title}
            </button>
          ))}
        </div>
        <p
          className="hidden whitespace-nowrap text-[13px] text-muted md:block"
          aria-live="polite"
        >
          {matching.length} produk
        </p>
      </div>
      <div
        key={filter}
        className="switch-enter grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-5 md:gap-y-10 xl:gap-x-6"
      >
        {visible.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </>
  );
}
