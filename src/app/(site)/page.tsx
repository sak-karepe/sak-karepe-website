import { assetPath, productImage, runwayImage } from "@/lib/assets";
import { LinkIcon } from "@/components/icons";
import Image from "@/components/site-image";
import Link from "next/link";
import { ConsultButton } from "@/components/site-shell";
import { Collection } from "@/components/collection";
import { RunwayGallery } from "@/components/runway-gallery";
import { Reveal } from "@/components/reveal";
import { contact, whatsappUrl } from "@/lib/contact";
const catalog = assetPath("/documents/katalog-2026.pdf");
export default function Home() {
  return (
    <main id="utama">
      <section
        className="wrap grid items-center gap-9 py-8 lg:grid-cols-[.9fr_1.1fr] lg:gap-14 lg:py-10"
        aria-labelledby="hero-title"
      >
        <div>
          <h1
            id="hero-title"
            className="mb-7 text-[clamp(42px,10.8vw,70px)] leading-[1.04] tracking-[-.065em] lg:text-[clamp(56px,5.4vw,80px)]"
          >
            <span className="hero-title-line">
              <span>Ecoprint dari</span>
            </span>
            <span className="hero-title-line">
              <span>ruang belajar.</span>
            </span>
          </h1>
          <p className="hero-enter max-w-[460px] text-[17px] xl:text-lg">
            Busana, tas, kain, dan sepatu bermotif daun dari pendidikan vokasi
            SLB Khusus Bina Mandiri, Surabaya. Karyanya telah tampil di
            panggung Jakarta, Yogyakarta, dan Surabaya.
          </p>
          <div className="hero-enter mt-8 flex flex-wrap items-center gap-5 xl:gap-7">
            <Link
              className="btn px-5 text-[15px] xl:px-6 xl:text-base"
              href="/koleksi"
            >
              Jelajahi koleksi <LinkIcon />
            </Link>
            <Link className="text-link" href="/cerita">
              Kenali cerita kami
            </Link>
          </div>
        </div>
        <div className="hero-images photo aspect-[4/5] lg:aspect-auto lg:h-[min(780px,calc(100svh-120px))] lg:min-h-[560px]">
          <Image
            src={runwayImage("8a672849-8119-4b5d-9aa4-181c2a4badf5")}
            alt="Model memperagakan busana dan luaran ecoprint bernuansa hijau di depan lengkung taman"
            fill
            preload
            sizes="(max-width: 1024px) 90vw, 50vw"
            className="object-cover object-[center_40%]"
          />
        </div>
      </section>
      <section
        className="wrap grid items-center gap-7 py-14 lg:grid-cols-2 lg:gap-12 lg:py-24 xl:gap-20"
        id="cerita"
        aria-labelledby="story-title"
      >
        <Reveal className="relative pr-7 pb-7 xl:pr-14 xl:pb-12">
          <div className="photo aspect-[1/1.15] md:h-[420px] md:aspect-auto xl:h-[500px]">
            <Image
              src={productImage("7e60ced3-8a64-4f26-9237-4cfc0aff6a41")}
              alt="Koleksi busana Sak Karepe di dekat jendela"
              fill
              sizes="(max-width: 768px) 80vw, 40vw"
              className="object-cover object-[center_48%]"
            />
          </div>
          <div className="photo absolute right-0 bottom-0 h-[190px] w-[34%] border-[6px] border-page xl:h-[240px] xl:border-8">
            <Image
              src={productImage("3ff6a2dc-af7f-47d0-8014-986368cfbe6c")}
              alt="Kain bermotif daun dengan kombinasi tepi bergaris"
              fill
              sizes="(max-width: 768px) 30vw, 16vw"
              className="object-cover"
            />
          </div>
        </Reveal>
        <Reveal>
          <h2
            id="story-title"
            className="max-w-[440px] text-[42px] xl:text-[54px]"
          >
            Dari sekolah,
            <br />
            menuju dunia.
          </h2>
          <p className="mt-6 max-w-[400px] text-muted">
            Sak Karepe tumbuh dari pendidikan vokasi di SLB Khusus Bina Mandiri.
            Sejak 2004, peserta didik diperkenalkan pada batik tulis dengan
            pewarnaan alami.
          </p>
          <p className="my-6 max-w-[400px] text-muted">
            Jumputan, shibori, lalu ecoprint membuka cara berkarya yang
            disesuaikan dengan kemampuan setiap anak. Setiap potensi mendapat
            ruang untuk tumbuh.
          </p>
          <Link className="text-link" href="/cerita">
            Baca cerita lengkapnya <LinkIcon />
          </Link>
        </Reveal>
      </section>
      <Reveal className="wrap">
        <section
          className="grid items-center gap-6 py-10 md:grid-cols-[1fr_1.2fr] xl:grid-cols-[1.1fr_1.2fr_.5fr] xl:gap-12"
          aria-labelledby="nature-title"
        >
          <h2 id="nature-title" className="text-[32px] xl:text-[34px]">
            Setiap daun,
            <br className="hidden md:block" /> jejak yang berbeda.
          </h2>
          <div>
            <p className="max-w-[420px] text-base text-muted">
              Daun dan bunga dari lingkungan menjadi sumber motif dan warna
              alami. Hasilnya punya karakter yang tidak selalu dapat diulang
              persis sama.
            </p>
            <a
              className="text-link mt-4"
              href={catalog}
              target="_blank"
              rel="noopener"
            >
              Baca katalog 2026 <LinkIcon />
            </a>
          </div>
          <div className="photo hidden h-[165px] xl:block">
            <Image
              src={productImage("8804e501-4559-4aa9-9848-df5476f1c64d")}
              alt="Jejak berbagai bentuk daun pada kain ecoprint"
              fill
              sizes="180px"
              className="object-cover object-[center_35%]"
            />
          </div>
        </section>
      </Reveal>
      <section
        id="koleksi"
        className="wrap py-10 md:pt-14 md:pb-24"
        aria-labelledby="collection-title"
      >
        <Reveal>
          <h2 id="collection-title">Temukan pilihanmu.</h2>
          <p className="mt-4 max-w-[540px] text-muted">
            Dari tote bag dan kaos, ecoprint berkembang menjadi busana, tas,
            sepatu, aksesori, dan homeware.
          </p>
          <Collection limit={8} />
          <Link className="text-link mt-9" href="/koleksi">
            Lihat seluruh koleksi <LinkIcon />
          </Link>
        </Reveal>
      </section>
      <section
        id="fashion-show"
        className="bg-surface py-11 md:pt-[72px] md:pb-12"
        aria-labelledby="runway-title"
      >
        <div className="wrap grid items-center gap-9 py-9 md:min-h-[610px] md:grid-cols-[1fr_1.12fr] md:gap-9 md:py-12 xl:min-h-[680px] xl:gap-14">
                    <div>
            <h2
              id="runway-title"
              className="text-5xl md:text-[clamp(48px,5.3vw,72px)] leading-[1.04] tracking-[-.065em]"
            >
              Jejak daun.
              <br />
              Langkah baru.
            </h2>
            <p className="mt-6 max-w-[540px] text-base text-muted md:text-[17px]">
              Karya dari ruang belajar hadir di panggung fashion. Dalam
              perjalanan Sak Karepe, koleksinya telah tampil di Jakarta,
              Yogyakarta, dan Surabaya.
            </p>

            <div className="mt-8">
              <Link
                className="text-link inline-flex items-center gap-2"
                href="/fashion-show"
              >
                Jelajahi galeri fashion show <LinkIcon />
              </Link>
            </div>
          </div>

                    <div className="grid min-w-0 grid-cols-2 items-start gap-3 xl:gap-4">
                        <div className="photo relative aspect-[2/3] min-w-0">
              <Image
                src={runwayImage("76e7b072-10ac-49da-9a8c-47ceb7187ad1")}
                alt="Model memperagakan busana ecoprint Sak Karepe di runway"
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
              />
            </div>

                        <div className="photo relative mt-8 aspect-[2/3] min-w-0 xl:mt-12">
              <Image
                src={runwayImage("ac8c207d-3ad3-4ffc-9660-d6beaa4e6380")}
                alt="Koleksi busana fashion show Sak Karepe"
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>
      <Reveal className="wrap">
        <section
          className="grid gap-6 pb-14 md:grid-cols-[1.05fr_.95fr] md:gap-12 md:pt-5 md:pb-[88px] xl:gap-[90px]"
          aria-labelledby="materials-title"
        >
          <div>
            <h2 id="materials-title" className="text-4xl md:text-[42px]">
              Kain pilihan.
              <br />
              Karakter alami.
            </h2>
            <p className="mt-6 max-w-[440px] text-muted">
              Katun premium, sutra, dan Bemberg menjadi pilihan material dalam
              proses berkarya. Ecoprint juga dipadukan dengan tenun ikat, lurik,
              dan batik.
            </p>
          </div>
          <div className="grid content-center">
            {[
              ["Katun · Sutra · Bemberg", "Ragam material untuk berkarya"],
              [
                "Tenun ikat · Lurik · Batik",
                "Bertemu motif dan warna ecoprint",
              ],
              ["Pounding · Steam", "Teknik yang terus dikembangkan"],
            ].map(([title, copy]) => (
              <div
                key={title}
                className="py-4"
              >
                <p className="text-lg font-medium">{title}</p>
                <p className="mt-1 text-sm text-muted">{copy}</p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>
      <Reveal className="wrap">
        <section
          id="pesanan-khusus"
          className="grid overflow-hidden rounded-md bg-surface md:grid-cols-[1.25fr_.75fr]"
          aria-labelledby="custom-title"
        >
          <div className="px-7 py-9 md:p-10 xl:px-[58px] xl:py-[52px]">
            <h2 id="custom-title" className="text-4xl xl:text-5xl">
              Punya ide sendiri?
            </h2>
            <p className="mt-4 mb-6 max-w-[440px] text-muted">
              Dari busana hingga tas, ceritakan motif dan bentuk yang kamu
              inginkan. Diskusikan pesanan khusus bersama Sak Karepe.
            </p>
            <ConsultButton />
          </div>
          <div className="relative h-[230px] md:h-auto">
            <Image
              src={productImage("193084ac-ee0b-4741-8f53-18729d7bce92")}
              alt="Tote bag ecoprint dengan susunan jejak daun cokelat"
              fill
              sizes="(max-width: 768px) 90vw, 35vw"
              className="object-cover object-[center_62%]"
            />
          </div>
        </section>
      </Reveal>

      <Reveal className="wrap mt-16 md:mt-24">
        <section
          id="kontak"
          className="grid gap-9 pt-12 md:grid-cols-[.8fr_1.2fr] md:gap-14"
          aria-labelledby="contact-title"
        >
          <div>
            <h2 id="contact-title">Mari berkunjung.</h2>
            <p className="mt-5 max-w-[400px] text-muted">
              Lihat karya lebih dekat, atau hubungi kami untuk membicarakan
              pilihan produk dan pesananmu.
            </p>
            <address className="mt-8 not-italic">
              <p className="font-medium">{contact.location}</p>
              <p className="mt-2 max-w-[370px] text-base text-muted">
                {contact.address}
              </p>
            </address>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link mt-6"
            >
              WhatsApp · {contact.phone} <LinkIcon />
            </a>
            <div className="mt-5">
              <a
                href={contact.maps}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Buka rute di Google Maps <LinkIcon />
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-md bg-surface">
            <iframe
              src={contact.embed}
              title="Peta lokasi SLB Khusus Bina Mandiri, Surabaya"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="h-[360px] w-full border-0 md:h-[460px]"
            />
          </div>
        </section>
      </Reveal>
    </main>
  );
}
