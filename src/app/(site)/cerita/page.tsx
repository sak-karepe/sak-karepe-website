import type { Metadata } from "next";
import Image from "@/components/site-image";
import { Breadcrumb } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { productImage } from "@/lib/assets";
import { getBlock } from "@/lib/page-blocks";

export const metadata: Metadata = {
  title: "Cerita kami · Sak Karepe",
  description:
    "Perjalanan pendidikan vokasi SLB Khusus Bina Mandiri, dari batik tulis dengan warna alami menuju karya ecoprint Sak Karepe.",
};

export default async function StoryPage() {
  const title1 = await getBlock("story_hero_title_1", "Dari sekolah.");
  const title2 = await getBlock("story_hero_title_2", "Menuju dunia.");
  const subtitle = await getBlock(
    "story_hero_subtitle",
    "Di balik karya Sak Karepe, ada ruang belajar dan kesempatan untuk mengembangkan potensi setiap anak."
  );
  const heroImg = await getBlock(
    "story_hero_img",
    productImage("7e60ced3-8a64-4f26-9237-4cfc0aff6a41")
  );

  const year2004 = await getBlock("story_2004_year", "2004");
  const label2004 = await getBlock("story_2004_label", "Awal pendidikan batik tulis");
  const title2004 = await getBlock("story_2004_title", "Belajar dari warna alami.");
  const p2004_1 = await getBlock(
    "story_2004_p1",
    "Sejak 2004, SLB Khusus Bina Mandiri mengenalkan batik tulis dengan pewarnaan alami kepada peserta didik. Kegiatan ini memberi ruang untuk belajar, berekspresi, dan melatih ketekunan."
  );
  const p2004_2 = await getBlock(
    "story_2004_p2",
    "Seiring perubahan kemampuan dan karakter anak, teknik jumputan dan shibori ikut diperkenalkan. Cara berkarya disesuaikan dengan kebutuhan peserta didik."
  );

  return (
    <main id="utama">
      <section className="wrap pt-8 md:pt-10">
        <Breadcrumb items={[{ label: "Cerita kami" }]} />
        <div className="mt-9 grid items-center gap-9 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <h1 className="page-title">
              <span className="hero-title-line">
                <span>{title1}</span>
              </span>
              <span className="hero-title-line">
                <span>{title2}</span>
              </span>
            </h1>
            <p className="hero-enter mt-7 max-w-[430px] text-lg text-muted">{subtitle}</p>
          </div>
          <div className="hero-images photo aspect-[4/5] max-h-[560px]">
            <Image
              src={heroImg}
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
        <section className="grid gap-8 lg:grid-cols-[.7fr_1.3fr] lg:gap-20">
          <div>
            <p className="text-6xl font-heading tracking-[-.06em] text-accent md:text-8xl">
              {year2004}
            </p>
            <p className="mt-3 text-sm text-muted">{label2004}</p>
          </div>
          <div className="max-w-[620px]">
            <h2 dangerouslySetInnerHTML={{ __html: title2004.replace("\n", "<br />") }} />
            <p className="mt-6 text-muted">{p2004_1}</p>
            <p className="mt-5 text-muted">{p2004_2}</p>
          </div>
        </section>
      </Reveal>
      {/* Sisa section cerita lainnya bisa ditambahkan dengan pola getBlock yang sama */}
    </main>
  );
}