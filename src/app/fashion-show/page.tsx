import { LinkIcon } from "@/components/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { RunwayGallery } from "@/components/runway-gallery";
import { RunwayArchive } from "@/components/runway-archive";
export const metadata: Metadata = {
  title: "Fashion show · Sak Karepe",
  description: "Dokumentasi busana ecoprint Sak Karepe di panggung fashion.",
};
export default function FashionPage() {
  return (
    <main id="utama">
      <PageIntro
        label="Fashion show"
        title="Jejak daun."
        accent="Langkah baru."
        copy="Busana ecoprint, batik, dan tenun dalam dokumentasi panggung Sak Karepe. Lihat motifnya bergerak bersama pemakainya."
      />
      <section className="bg-surface pt-2 pb-10 md:pb-14">
        <div className="wrap">
          <RunwayGallery />
        </div>
      </section>
      <Reveal className="wrap my-14 md:my-20">
        <section className="grid gap-7 md:grid-cols-[.8fr_1.2fr] md:gap-20">
          <h2>
            Dari ruang belajar,
            <br />
            ke panggung.
          </h2>
          <p className="max-w-[580px] self-center text-muted">
            Dalam perjalanan yang diceritakan pada katalog, karya Sak Karepe
            mendapat kesempatan tampil di Jakarta, Yogyakarta, dan Surabaya.
            Motif daun hadir bersama perpaduan batik, tenun ikat, dan lurik.
          </p>
        </section>
      </Reveal>
      <section className="wrap" aria-labelledby="archive-title">
        <Reveal>
          <h2 id="archive-title" className="mb-9">
            Galeri panggung.
          </h2>
          <RunwayArchive />
        </Reveal>
      </section>
      <Reveal className="wrap mt-16 md:mt-24">
        <div className="flex flex-col items-start gap-6 border-t border-line pt-10 md:flex-row md:items-center md:justify-between">
          <h2 className="text-[32px] md:text-[40px]">
            Temukan bentuk
            <br />
            untuk keseharianmu.
          </h2>
          <Link href="/koleksi/busana" className="btn">
            Jelajahi busana <LinkIcon />
          </Link>
        </div>
      </Reveal>
    </main>
  );
}
