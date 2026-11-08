"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import type { CatalogProduct } from "@/lib/catalog";
import { ProductCard } from "./product-card";

const DEBOUNCE_MS = 300;

export function CollectionFilter({
  products,
  categories,
  limit,
  initialQ = "",
  initialKoleksi = "all",
}: {
  products: CatalogProduct[];
  categories: { slug: string; title: string }[];
  limit?: number;
  initialQ?: string;
  initialKoleksi?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const syncUrl = !limit;
  const [filter, setFilter] = useState(initialKoleksi);
  const [query, setQuery] = useState(initialQ);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef({ koleksi: initialKoleksi, q: initialQ });

  function pushUrl(nextKoleksi: string, nextQuery: string) {
    if (!syncUrl) return;
    const q = nextQuery.trim();
    if (nextKoleksi === lastPushed.current.koleksi && q === lastPushed.current.q) return;
    lastPushed.current = { koleksi: nextKoleksi, q };
    const params = new URLSearchParams({
      ...(nextKoleksi !== "all" && { koleksi: nextKoleksi }),
      ...(q && { q }),
    });
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  function handleQueryChange(next: string) {
    setQuery(next);
    if (!syncUrl) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pushUrl(filter, next), DEBOUNCE_MS);
  }

  function handleFilterChange(nextFilter: string) {
    setFilter(nextFilter);
    if (!syncUrl) return;
    if (timer.current) clearTimeout(timer.current);
    pushUrl(nextFilter, query);
  }

  function resetQuery() {
    if (timer.current) clearTimeout(timer.current);
    setQuery("");
    pushUrl(filter, "");
  }

  function resetAll() {
    if (timer.current) clearTimeout(timer.current);
    setQuery("");
    setFilter("all");
    pushUrl("all", "");
  }

  useEffect(() => {
    if (initialQ !== lastPushed.current.q) {
      lastPushed.current.q = initialQ;
      setQuery(initialQ);
    }
  }, [initialQ]);

  useEffect(() => {
    if (initialKoleksi !== lastPushed.current.koleksi) {
      lastPushed.current.koleksi = initialKoleksi;
      setFilter(initialKoleksi);
    }
  }, [initialKoleksi]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const trimmedQuery = query.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const activeCategory = categories.find((category) => category.slug === filter);

  const matching = products.filter((product) => {
    if (filter !== "all" && product.categorySlug !== filter) return false;
    if (!normalizedQuery) return true;
    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.description.toLowerCase().includes(normalizedQuery)
    );
  });

  const visible = limit ? matching.slice(0, limit) : matching;

  return (
    <>
      {syncUrl && (
        <form
          action={pathname}
          method="get"
          role="search"
          className="mt-8 flex max-w-md items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (timer.current) clearTimeout(timer.current);
            pushUrl(filter, query);
          }}
        >
          {filter !== "all" && <input type="hidden" name="koleksi" value={filter} />}
          <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-line bg-page px-3 focus-within:border-accent">
            <MagnifyingGlassIcon size={18} aria-hidden="true" className="shrink-0 text-muted" />
            <span className="sr-only">Cari nama atau deskripsi produk</span>
            <input
              type="search"
              name="q"
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              maxLength={80}
              autoComplete="off"
              aria-busy={pending}
              placeholder="Cari nama atau deskripsi produk"
              className="min-w-0 flex-1 bg-transparent py-2 text-[15px] focus:outline-none"
            />
          </label>
          <button
            type="submit"
            className="min-h-11 rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent"
          >
            Cari
          </button>
          {query && (
            <button type="button" onClick={resetQuery} className="px-2 text-sm text-muted hover:text-ink">
              Reset
            </button>
          )}
        </form>
      )}

      <div className={`${syncUrl ? "mt-5" : "mt-8"} mb-7 flex flex-wrap items-center justify-between gap-4`}>
        <div
          className="flex min-w-0 flex-wrap gap-2"
          role="group"
          aria-label="Filter koleksi"
        >
          {[{ slug: "all", title: "Semua" }, ...categories].map((category) => (
            <button
              key={category.slug}
              type="button"
              aria-pressed={filter === category.slug}
              onClick={() => handleFilterChange(category.slug)}
              className={`min-h-12 shrink-0 rounded-md px-3 py-3 text-[15px] transition-colors hover:text-accent ${filter === category.slug ? "bg-surface font-medium text-ink" : "text-muted"}`}
            >
              {category.title}
            </button>
          ))}
        </div>
        <p
          className="whitespace-nowrap text-[13px] text-muted"
          aria-live="polite"
        >
          {matching.length} produk
        </p>
      </div>

      {visible.length === 0 ? (
        <div key={`${filter}-${trimmedQuery}`} className="py-16 text-center">
          <p className="text-muted">
            {trimmedQuery
              ? `Tidak ada produk yang cocok dengan "${trimmedQuery}"${activeCategory ? ` di koleksi ${activeCategory.title}` : ""}.`
              : "Belum ada produk yang ditampilkan di koleksi ini."}
          </p>
          {(trimmedQuery || filter !== "all") && (
            <Link
              href={pathname}
              scroll={false}
              onClick={(event) => {
                event.preventDefault();
                resetAll();
              }}
              className="mt-4 inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm transition-colors hover:border-accent hover:text-accent"
            >
              {trimmedQuery && filter === "all" ? "Reset pencarian" : "Reset filter"}
            </Link>
          )}
        </div>
      ) : (
        <div
          key={`${filter}-${trimmedQuery}`}
          className="stagger grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-4 md:gap-x-5 md:gap-y-10 xl:gap-x-6"
        >
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </>
  );
}
