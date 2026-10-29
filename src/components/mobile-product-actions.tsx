"use client";

import { WhatsappLogoIcon } from "@phosphor-icons/react";
import { AddToCartButton, BuyButton } from "@/components/buy-button";
import { whatsappUrl } from "@/lib/contact";

type MobileProductActionsProps = {
  id: number;
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
  name,
  price,
  stock,
  image,
}: MobileProductActionsProps) {
  const product = { id, name, price, stock, image };
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
          <WhatsappLogoIcon size={26} aria-hidden="true" />
        </a>

        <AddToCartButton
          product={product}
          className="flex h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-xl border border-[var(--foreground)] px-2 text-sm"
        />

        <div className="min-w-0 flex-1 [&_button]:!h-12 [&_button]:!w-full [&_button]:!px-2 [&_button]:!text-sm">
          <BuyButton product={product} />
        </div>
      </div>
    </div>
  );
}
