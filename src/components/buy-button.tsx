"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import type { CheckoutProduct } from "@/components/checkout";
import { useSite } from "@/components/site-shell";

/** Penanda di URL bahwa pengguna sedang membeli sebelum diarahkan ke login Google. */
const resumeParam = "beli";

/**
 * Tombol "Beli sekarang". Pengunjung yang belum masuk diminta login dulu; login Google kembali ke halaman ini
 * dengan ?beli=1 sehingga modal alamat langsung terbuka.
 */
export function BuyButton({ product, slug }: { product: CheckoutProduct; slug: string }) {
  const { status } = useSession();
  const { open } = useSite();

  useEffect(() => {
    if (status === "loading") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has(resumeParam)) return;
    url.searchParams.delete(resumeParam);
    window.history.replaceState(null, "", url);
    if (status === "authenticated") open({ kind: "checkout", product });
  }, [status, open, product]);

  if (product.stock === 0) return null;
  return (
    <button
      className="btn"
      disabled={status === "loading"}
      onClick={() =>
        status === "authenticated"
          ? open({ kind: "checkout", product })
          : open({
              kind: "login",
              notice: "Masuk dulu untuk melanjutkan pembelian.",
              redirectTo: `/produk/${slug}?${resumeParam}=1`,
            })
      }
    >
      Beli sekarang
    </button>
  );
}
