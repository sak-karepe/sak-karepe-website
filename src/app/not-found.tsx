import { LinkIcon } from "@/components/icons";
import { SiteShell } from "@/components/site-shell";
import Link from "next/link";
export default function NotFound() {
  return (
    <SiteShell>
      <main id="utama" className="wrap py-20">
        <p className="text-accent">Halaman tidak ditemukan</p>
        <h1 className="page-title mt-5">
          Kembali melihat
          <br />
          karya Sak Karepe.
        </h1>
        <Link href="/koleksi" className="btn mt-8">
          Jelajahi koleksi <LinkIcon />
        </Link>
      </main>
    </SiteShell>
  );
}
