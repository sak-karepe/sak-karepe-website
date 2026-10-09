import { LinkIcon } from "@/components/icons";
import type { Metadata } from "next";
import Image from "@/components/site-image";
import Link from "next/link";
import { Collection } from "@/components/collection";
import { Breadcrumb } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { productImage } from "@/lib/collection-details";
export const metadata: Metadata = {
  title: "Koleksi · Sak Karepe",
  description:
    "Jelajahi ragam tas, busana, sepatu, dan kain ecoprint Sak Karepe.",
};
export default function CollectionPage() {
  return (
    <main id="utama">
      <div className="wrap pt-8 md:pt-10">
        <Breadcrumb items={[{ label: "Koleksi" }]} />
        <section className="collection-banner mt-6" aria-labelledby="collection-title">
          <div className="relative z-10 px-6 py-9 md:px-10 md:py-12">
            <p className="text-xs uppercase tracking-[.16em] text-accent">Sak Karepe / Ecoprint</p>
            <h1 id="collection-title" className="mt-5 text-[38px] leading-[1.08] tracking-[-.055em] md:text-[48px]">
              Jejak daun.<br /><span className="text-accent">Ragam karya.</span>
            </h1>
            <p className="mt-5 max-w-[310px] text-sm text-muted">
              Busana, tas, kain, dan benda keseharian dengan warna dan motif dari alam.
            </p>
            <Link href="#ragam-koleksi" className="text-link mt-6">Jelajahi koleksi <LinkIcon /></Link>
          </div>
          <div className="collection-banner-photos" aria-hidden="true">
            <div className="relative overflow-hidden rounded-md">
              <Image src={productImage("7e60ced3-8a64-4f26-9237-4cfc0aff6a41")}
                alt="" fill preload sizes="(max-width: 768px) 45vw, 28vw" className="object-cover object-[center_40%]" />
            </div>
            <div className="relative overflow-hidden rounded-md">
              <Image src={productImage("41b579e7-e0b6-40fa-83f1-1c8b20a08637")}
                alt="" fill preload sizes="(max-width: 768px) 40vw, 23vw" className="object-cover" />
            </div>
          </div>
        </section>
        <div id="ragam-koleksi" className="scroll-mt-24">
          <Collection showAllCategories />
        </div>
      </div>
      <Reveal className="wrap mt-16 md:mt-24">
        <section className="grid gap-6 border-t border-line pt-10 md:grid-cols-[1.1fr_1fr] md:gap-20">
          <h2>
            Motif alami,
            <br />
            hasil yang personal.
          </h2>
          <div>
            <p className="max-w-[450px] text-muted">
              Setiap daun membawa bentuk dan warna berbeda. Foto-foto ini
              memperlihatkan ragam karya; motif pada pesanan berikutnya dapat
              berbeda.
            </p>
            <Link href="/#pesanan-khusus" className="text-link mt-6">
              Punya ide untuk pesanan khusus? <LinkIcon />
            </Link>
          </div>
        </section>
      </Reveal>
    </main>
  );
}
