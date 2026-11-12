"use client";
import { useEffect, useState } from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { maxQuantity, type CartItem, type CheckoutProduct } from "@/components/checkout";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSite } from "@/components/site-shell";

/** Menambah satu produk ke keranjang, tanpa melewati batas stok. Stok item yang sudah ada ikut disegarkan dari produk. */
function addItem(items: CartItem[], product: CheckoutProduct) {
  const existing = items.find((item) => item.id === product.id);
  if (!existing) return [...items, { ...product, quantity: 1 }];
  return items.map((item) =>
    item.id === product.id
      ? { ...item, stock: product.stock, quantity: Math.min(item.quantity + 1, maxQuantity(product)), stockLeft: undefined }
      : item,
  );
}

/** "Tambah ke keranjang" lalu lanjut belanja; login baru diminta saat memesan dari keranjang. */
export function AddToCartButton({ product, className }: { product: CheckoutProduct; className: string }) {
  const { cart, updateCart } = useSite();
  const isAdmin = useSession().data?.user?.isAdmin;
  const [added, setAdded] = useState(false);
  const limit = maxQuantity(product);
  const full = (cart.find((item) => item.id === product.id)?.quantity ?? 0) >= limit;

  // Tanda "Ditambahkan" hanya sebentar, lalu tombol kembali ke teks semula.
  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), 2000);
    return () => window.clearTimeout(timer);
  }, [added]);

  if (isAdmin)
    return (
      <p className="py-2 text-sm text-muted italic">
        Kamu masuk sebagai admin. Kelola produk di{" "}
        <Link href="/admin" className="text-accent underline">
          dashboard
        </Link>
        .
      </p>
    );

  return (
    <button
      className={className}
      disabled={full}
      onClick={() => {
        updateCart((items) => addItem(items, product));
        setAdded(true);
      }}
    >
      <span aria-live="polite" className="inline-flex items-center gap-2">
        {added ? (
          <>
            Ditambahkan <Check size={18} weight="bold" aria-hidden="true" />
          </>
        ) : full ? (
          limit < 1 ? (
            "Stok habis"
          ) : (
            "Stok maksimal di keranjang"
          )
        ) : (
          "Tambah ke keranjang"
        )}
      </span>
    </button>
  );
}

/** "Beli sekarang": masukkan ke keranjang (bila belum ada) lalu buka keranjang. */
export function BuyButton({ product }: { product: CheckoutProduct }) {
  const { open, updateCart } = useSite();
  if (useSession().data?.user?.isAdmin) return null;
  return (
    <button
      className="btn"
      onClick={() => {
        updateCart((items) => (items.some((item) => item.id === product.id) ? items : addItem(items, product)));
        open({ kind: "checkout" });
      }}
    >
      Beli sekarang
    </button>
  );
}