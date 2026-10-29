"use client";
import { useState } from "react";
import { maxQuantity, type CartItem, type CheckoutProduct } from "@/components/checkout";
import { useSite } from "@/components/site-shell";

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
  const { updateCart } = useSite();
  const [added, setAdded] = useState(false);
  if (product.stock === 0) return null;
  return (
    <button
      className={className}
      onClick={() => {
        updateCart((items) => addItem(items, product));
        setAdded(true);
      }}
    >
      <span aria-live="polite">{added ? "Ditambahkan ✓" : "Tambah ke keranjang"}</span>
    </button>
  );
}

/** "Beli sekarang": masukkan ke keranjang (bila belum ada) lalu buka keranjang. */
export function BuyButton({ product }: { product: CheckoutProduct }) {
  const { open, updateCart } = useSite();
  if (product.stock === 0) return null;
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
