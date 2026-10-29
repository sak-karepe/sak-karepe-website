"use client";

import { BuyButton } from "@/components/buy-button";
import { whatsappUrl } from "@/lib/contact";

type MobileProductActionsProps = {
  id: number;
  slug: string;
  name: string;
  price: number | null;
  stock: number | null;
  image: {
    src: string;
    alt: string;
  };
};

export function MobileProductActions({
  id,
  slug,
  name,
  price,
  stock,
  image,
}: MobileProductActionsProps) {
  const message = `Halo Sak Karepe, saya tertarik dengan produk "${name}". Boleh saya tahu ukuran, motif, dan harga yang tersedia?`;
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e5dfd3] bg-[#faf8f3] px-5 py-3 shadow-[0_-4px_20px_rgba(45,55,35,0.08)] md:hidden">
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <a
          href={whatsappUrl(message)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Tanyakan melalui WhatsApp"
          className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#28783c] text-white"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="size-7"
            aria-hidden="true"
          >
            <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-5.1A8.5 8.5 0 1 1 21 11.5Z" />
            <path d="M8.5 8.5c.5 2.5 2 4 4.5 5l1.5-1 2 1c-.3 1.5-1.5 2-3 1.5-3.5-1-5.5-3.5-6-6-.2-1 .5-2 1.5-2Z" />
          </svg>
        </a>

        {/* Wishlist sementara berupa tautan, tanpa handler palsu */}
        <a
          href="/wishlist"
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1 whitespace-nowrap rounded-xl border border-[var(--foreground)] px-2 text-sm"
        >
          Masukkan Wishlist <span aria-hidden="true">♡</span>
        </a>

        <div className="min-w-0 flex-1 [&_button]:!h-12 [&_button]:!w-full [&_button]:!px-2 [&_button]:!text-sm">
          <BuyButton slug={slug} product={{ id, name, price, stock, image }} />
        </div>
      </div>
    </div>
  );
}
