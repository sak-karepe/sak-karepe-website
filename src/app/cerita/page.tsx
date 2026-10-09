import { assetPath } from "@/lib/assets";
import { LinkIcon } from "@/components/icons";
import type { Metadata } from "next";
import Image from "@/components/site-image";
import Link from "next/link";
import { Breadcrumb } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { productImage } from "@/lib/collection-details";
export const metadata: Metadata = {
  title: "Cerita kami · Sak Karepe",
  description:
    "Perjalanan pendidikan vokasi SLB Khusus Bina Mandiri, dari batik tulis dengan warna alami menuju karya ecoprint Sak Karepe.",
};
export default function StoryPage() {
  return (
    <main id="utama">
      <section className="wrap pt-8 md:pt-10">
        <Breadcrumb items={[{ label: "Cerita kami" }]} />
        <div className="mt-9 grid items-center gap-9 md:grid-cols-[1.1fr_1fr] md:gap-16">
          <div>
            <h1 className="page-title">
              <span className="hero-title-line">
                <span>Dari sekolah.</span>
              </span>
              <span className="hero-title-line text-accent">
                <span>Menuju dunia.</span>
              </span>
            </h1>
            <p className="hero-enter mt-7 max-w-[430px] text-lg text-muted">
              Di balik karya Sak Karepe, ada ruang belajar dan kesempatan untuk
              mengembangkan potensi setiap anak.
            </p>
          </div>
          <div className="hero-images photo aspect-[4/5] max-h-[560px]">
            <Image
              src={productImage("7e60ced3-8a64-4f26-9237-4cfc0aff6a41")}
              alt="Busana Sak Karepe tersusun di dekat jendela"
              fill
              preload
              sizes="(max-width: 768px) 90vw, 45vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
      <Reveal className="wrap my-16 md:my-24">
        <section className="grid gap-8 border-t border-line pt-10 md:grid-cols-[.7fr_1.3fr] md:gap-20">
          <div>
            <p className="text-6xl font-heading tracking-[-.06em] text-accent md:text-8xl">
              2004
            </p>
            <p className="mt-3 text-sm text-muted">
              Awal pendidikan batik tulis
            </p>
          </div>
          <div className="max-w-[620px]">
            <h2>
              Belajar dari
              <br />
              warna alami.
            </h2>
            <p className="mt-6 text-muted">
              Sejak 2004, SLB Khusus Bina Mandiri mengenalkan batik tulis dengan
              pewarnaan alami kepada peserta didik. Kegiatan ini memberi ruang
              untuk belajar, berekspresi, dan melatih ketekunan.
            </p>
            <p className="mt-5 text-muted">
              Seiring perubahan kemampuan dan karakter anak, teknik jumputan dan
              shibori ikut diperkenalkan. Cara berkarya disesuaikan dengan
              kebutuhan peserta didik.
            </p>
          </div>
        </section>
      </Reveal>
      <section className="bg-surface py-12 md:py-20">
        <Reveal className="wrap grid gap-9 md:grid-cols-[1.2fr_.8fr] md:gap-16">
          <div className="photo aspect-[4/3]">
            <Image
              src={productImage("8804e501-4559-4aa9-9848-df5476f1c64d")}
              alt="Jejak daun berwarna hijau dan ungu pada kain ecoprint"
              fill
              sizes="(max-width: 768px) 90vw, 50vw"
              className="object-cover object-[center_35%]"
            />
          </div>
          <div className="self-center">
            <h2>
              Bertemu daun.
              <br />
              Menemukan bentuk.
            </h2>
            <p className="mt-6 text-muted">
              Ecoprint membuka pengalaman baru: melihat warna dan bentuk daun
              berpindah ke kain melalui teknik pounding. Pengembangan teknik
              steam kemudian memperluas media berkarya.
            </p>
            <p className="mt-5 text-muted">
              Dari tote bag dan kaos, karya berkembang menjadi kain, tas,
              sepatu, kemeja, dress, aksesori, dan homeware.
            </p>
          </div>
        </Reveal>
      </section>
      <Reveal className="wrap py-14 md:py-24">
        <section className="max-w-[860px]">
          <h2>Ruang untuk tumbuh.</h2>
          <p className="mt-7 max-w-[700px] text-xl leading-relaxed text-muted">
            Sak Karepe lahir dari perjalanan pendidikan vokasi. Setiap karya
            membawa proses belajar, keberanian mencoba, dan kesempatan membangun
            kemandirian.
          </p>
          <p className="mt-6 max-w-[650px] text-muted">
            Motif ecoprint kini juga dipadukan dengan tenun ikat, lurik, dan
            batik. Karya dari ruang belajar mendapat kesempatan hadir di pameran
            dan panggung fashion.
          </p>
          <Link href="/fashion-show" className="text-link mt-7">
            Lihat karya di panggung <LinkIcon />
          </Link>
        </section>
        <div className="mt-12 border-t border-line pt-6">
          <a
            href={assetPath("/documents/katalog-2026.pdf")}
            target="_blank"
            rel="noopener"
            className="text-link"
          >
            Baca katalog Sak Karepe 2026 <LinkIcon />
          </a>
        </div>
      </Reveal>
    </main>
  );
}
