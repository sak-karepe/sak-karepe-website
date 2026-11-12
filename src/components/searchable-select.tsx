"use client";
import { useEffect, useId, useRef, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { searchLimit } from "@/lib/search";

export type SearchOption = { value: string; label: string };

/**
 * Dropdown yang bisa dicari; pencarian dilakukan server lewat `load`, jadi client hanya memegang hasil yang tampil.
 * Pola ARIA combobox: ketik untuk mencari, panah atas/bawah, Enter memilih, Escape menutup.
 */
export function SearchableSelect<T extends SearchOption>({
  id,
  name,
  value,
  onChange,
  load,
  placeholder = "Pilih…",
  disabled,
  required,
  className,
}: {
  id: string;
  /** Nama field form; nilainya `value.value` lewat input tersembunyi. */
  name?: string;
  value: T | null;
  onChange: (option: T) => void;
  /** Mencari di server. Bungkus dengan useCallback: identitas baru = daftar dimuat ulang. */
  load: (query: string) => Promise<T[]>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ query: string; load: typeof load; options: T[]; failed?: boolean } | null>(null);
  const isOpen = open && !disabled;

  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    // Jeda singkat saat mengetik supaya server tidak dipanggil per huruf.
    const timer = setTimeout(
      () =>
        load(query).then(
          (options) => current && (setResult({ query, load, options }), setActive(0)),
          () => current && setResult({ query, load, options: [], failed: true }),
        ),
      query ? 250 : 0,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [isOpen, query, load, attempt]);

  // Input tersembunyi tidak ikut validasi browser, jadi "wajib" dicek di input yang terlihat.
  useEffect(() => {
    inputRef.current?.setCustomValidity(required && !value ? "Pilih salah satu dari daftar." : "");
  }, [required, value]);

  const fresh = result?.query === query && result.load === load ? result : null;
  // Selama hasil baru dimuat, hasil query sebelumnya tetap tampil supaya daftar tidak berkedip.
  const shown = fresh ?? (result?.load === load && !result.failed ? result : null);
  const options = shown?.options ?? [];

  const pick = (option: T) => {
    onChange(option);
    setOpen(false);
    setQuery("");
  };
  const move = (delta: number) => {
    if (!isOpen) return setOpen(true);
    if (!options.length) return;
    const next = Math.min(Math.max(active + delta, 0), options.length - 1);
    setActive(next);
    document.getElementById(`${listId}-${next}`)?.scrollIntoView({ block: "nearest" });
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={isOpen && options[active] ? `${listId}-${active}` : undefined}
        disabled={disabled}
        placeholder={value?.label ?? placeholder}
        className={`${className} truncate pr-9`}
        value={isOpen ? query : (value?.label ?? "")}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            move(event.key === "ArrowDown" ? 1 : -1);
          } else if (event.key === "Enter" && isOpen) {
            event.preventDefault();
            if (options[active]) pick(options[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
      />
      {name && <input type="hidden" name={name} value={value?.value ?? ""} />}
      <CaretDownIcon
        size={14}
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
        aria-hidden="true"
      />
      {isOpen && (
        <div
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-line bg-page text-[15px] shadow-lg"
          // Mencegah input kehilangan fokus sebelum klik pada opsi terbaca.
          onMouseDown={(event) => event.preventDefault()}
        >
          <ul id={listId} role="listbox" className="max-h-64 overflow-auto">
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={`cursor-pointer px-3.5 py-2 ${index === active ? "bg-surface" : ""} ${option.value === value?.value ? "font-medium text-accent" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(option)}
              >
                {option.label}
              </li>
            ))}
          </ul>
          <p role="status" className="px-3.5 text-sm text-muted empty:hidden [&:not(:empty)]:py-2">
            {!shown && "Memuat…"}
            {fresh && !fresh.failed && !options.length && "Tidak ditemukan."}
            {/* Server membatasi hasil; tanpa petunjuk ini pembeli bisa mengira datanya tidak ada. */}
            {options.length >= searchLimit && "Ketik untuk mencari yang lain…"}
          </p>
          {fresh?.failed && (
            <p role="alert" className="px-3.5 py-2 text-sm text-danger">
              Gagal memuat.{" "}
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => {
                  setResult(null);
                  setAttempt((n) => n + 1);
                }}
              >
                Coba lagi
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
