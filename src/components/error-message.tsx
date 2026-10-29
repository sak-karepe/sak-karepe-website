"use client";
import Link from "next/link";
import { whatsappUrl } from "@/lib/contact";

/**
 * Isi halaman error.tsx. Pesan galat tidak ditampilkan; di produksi Next.js hanya meneruskan `digest` untuk dicocokkan
 * dengan log server.
 */
export function ErrorMessage({ error, retry, admin = false }: { error: unknown; retry: () => void; admin?: boolean }) {
  const digest = error instanceof Error && "digest" in error && error.digest ? String(error.digest) : null;
  return (
    <main id="utama" className={admin ? "px-5 py-8 md:px-10 md:py-12" : "wrap py-20"}>
      <p className="text-accent">Terjadi gangguan</p>
      <h1 className="page-title mt-5">Halaman ini belum bisa dimuat.</h1>
      <p className="mt-5 max-w-xl text-muted">
        Mungkin layanan sedang gangguan. Coba lagi sebentar
        {admin ? "." : ", atau hubungi Sak Karepe lewat WhatsApp bila masih gagal."}
        {digest && ` Kode galat: ${digest}.`}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button className="btn" onClick={retry}>
          Coba lagi
        </button>
        {!admin && (
          <a className="text-link" href={whatsappUrl(`Halo Sak Karepe, website menampilkan galat${digest ? ` (kode ${digest})` : ""}.`)}>
            Hubungi WhatsApp
          </a>
        )}
        <Link className="text-link" href={admin ? "/admin" : "/"}>
          {admin ? "Kembali ke dashboard" : "Kembali ke beranda"}
        </Link>
      </div>
    </main>
  );
}
