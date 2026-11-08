"use client";
import { useState } from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { maxQuantity, type CartItem, type CheckoutProduct } from "@/components/checkout";
import { useSite } from "@/components/site-shell";
import { useSession } from "next-auth/react";
import Link from "next/link";

/** Menambah satu produk ke keranjang, tanpa melewati batas stok. */
function addItem(items: CartItem[], product: CheckoutProduct) {
  const existing = items.find((item) => item.id === product.id);
  if (!existing) return [...items, { ...product, quantity: 1 }];
  return items.map((item) =>
    item.id === product.id ? { ...item, quantity: Math.min(item.quantity + 1, maxQuantity(product)) } : item,
  );
}

/** "Tambah ke keranjang" lalu lanjut belanja; login baru diminta saat memesan dari keranjang. */
export function AddToCartButton({ product, className }: { product: CheckoutProduct; className: string }) {
  const { data: session } = useSession();
  const { updateCart } = useSite();
  const [added, setAdded] = useState(false);

  if (session?.user?.isAdmin) {
    return (
      <p className="text-sm text-muted italic py-2">
        Kamu masuk sebagai admin. Kelola produk di{" "}
        <Link href="/admin" className="text-accent underline">
          dashboard
        </Link>
        .
      </p>
    );
  }

  return (
    <button
      className={className}
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
        ) : (
          "Tambah ke keranjang"
        )}
      </span>
    </button>
  );
}

/** "Beli sekarang": masukkan ke keranjang (bila belum ada) lalu buka keranjang. */
export function BuyButton({ product }: { product: CheckoutProduct }) {
  const { data: session } = useSession();
  const { open, updateCart } = useSite();

  if (session?.user?.isAdmin) {
    return null; // Sembunyikan tombol beli sekarang jika admin
  }

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