"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";

const DEBOUNCE_MS = 300;

/**
 * Kotak pencarian produk admin: mengetik langsung menyinkronkan `?q=` di URL (debounce)
 * dan mereset pagination ke halaman 1. `koleksi` dipertahankan supaya filter koleksi
 * dan pencarian bisa dikombinasikan.
 */
export function ProductsSearch({ initialQ, koleksi }: { initialQ: string; koleksi: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialQ);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushed = useRef(initialQ);

  function push(next: string) {
    const q = next.trim();
    if (q === lastPushed.current) return;
    lastPushed.current = q;
    const params = new URLSearchParams({ ...(koleksi && { koleksi }), ...(q && { q }) });
    startTransition(() => {
      router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
    });
  }

  function onChange(next: string) {
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), DEBOUNCE_MS);
  }

  function reset() {
    if (timer.current) clearTimeout(timer.current);
    setValue("");
    push("");
  }

  // Bila URL berubah dari luar (mis. klik "Reset pencarian" atau pindah tab), samakan isi input.
  useEffect(() => {
    if (initialQ !== lastPushed.current) {
      lastPushed.current = initialQ;
      setValue(initialQ);
    }
  }, [initialQ]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <form
      action={pathname}
      method="get"
      role="search"
      className="mt-6 flex max-w-md items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (timer.current) clearTimeout(timer.current);
        push(value);
      }}
    >
      {koleksi && <input type="hidden" name="koleksi" value={koleksi} />}
      <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-line bg-page px-3 focus-within:border-accent">
        <MagnifyingGlassIcon size={18} aria-hidden="true" className="shrink-0 text-muted" />
        <span className="sr-only">Cari nama atau slug produk</span>
        <input
          type="search"
          name="q"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={80}
          autoComplete="off"
          aria-busy={pending}
          placeholder="Nama atau slug produk"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] focus:outline-none"
        />
      </label>
      <button
        type="submit"
        className="min-h-11 rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent"
      >
        Cari
      </button>
      {value && (
        <button type="button" onClick={reset} className="px-2 text-sm text-muted hover:text-ink">
          Reset
        </button>
      )}
    </form>
  );
}

