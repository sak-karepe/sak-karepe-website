import { assetPath, productImage, runwayImage } from "@/lib/assets";
import { LinkIcon } from "@/components/icons";
import Image from "@/components/site-image";
import Link from "next/link";
import { Collection } from "@/components/collection";
import { RunwayGallery } from "@/components/runway-gallery";
import { Reveal } from "@/components/reveal";
import { contact, whatsappUrl } from "@/lib/contact";
const catalog = assetPath("/documents/katalog-2026.pdf");
export default function Home() {
  return (
    <main id="utama">
      <section
        className="wrap grid items-center gap-9 py-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-14 lg:py-10"
        aria-labelledby="hero-title"
      >
        <div>
          <h1
            id="hero-title"
            className="mb-7 text-[clamp(42px,10.8vw,70px)] leading-[1.04] tracking-[-.065em] lg:text-[clamp(56px,7.4vw,112px)]"
          >
            <span className="hero-title-line">
              <span>Ecoprint dari</span>
            </span>
            <span className="hero-title-line">
              <span>ruang belajar.</span>
            </span>
          </h1>
          <p className="hero-enter max-w-[460px]">
            Busana, tas, kain, dan sepatu bermotif daun dari pendidikan vokasi
            SLB Khusus Bina Mandiri, Surabaya. Karyanya telah tampil di
            panggung Jakarta, Yogyakarta, dan Surabaya.
          </p>
          <div className="hero-enter mt-8 flex flex-wrap items-center gap-5 xl:gap-7">
            <Link
              className="btn btn-outline px-5 xl:px-6"
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
        className="wrap grid items-center gap-7 py-14 lg:grid-cols-[1.25fr_1fr] lg:gap-12 lg:py-24 xl:gap-20"
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
            className="max-w-[440px]"
          >
            Dimulai dari
            <br />
            batik tulis.
          </h2>
          <p className="mt-6 max-w-[520px] text-muted">
            Sak Karepe tumbuh dari pendidikan vokasi di SLB Khusus Bina Mandiri.
            Sejak 2004, peserta didik diperkenalkan pada batik tulis dengan
            pewarnaan alami.
          </p>
          <p className="my-6 max-w-[520px] text-muted">
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
          className="grid items-end gap-6 py-10 lg:grid-cols-[1fr_1.2fr] lg:py-20 xl:gap-12"
          aria-labelledby="nature-title"
        >
          <h2 id="nature-title">
            Setiap daun,
            <br className="hidden lg:block" /> jejak yang berbeda.
          </h2>
          <div>
            <p className="max-w-[420px] text-muted">
              Daun dan bunga dari lingkungan menjadi sumber motif dan warna
              alami. Hasilnya punya karakter yang tidak selalu dapat diulang
              persis sama.
            </p>
          </div>
          <figure className="mt-8 lg:col-span-2 lg:mt-16">
            <blockquote className="max-w-[980px] text-[21px] leading-[1.35] tracking-[-.02em] md:text-[32px] xl:text-[36px]">
              &ldquo;Setiap helai daun meninggalkan jejak yang berbeda. Setiap
              tangan menghasilkan cerita yang berbeda.&rdquo;
            </blockquote>
            <figcaption className="mt-5">
              <a
                className="text-link"
                href={catalog}
                target="_blank"
                rel="noopener"
              >
                Katalog Sak Karepe 2026 <LinkIcon />
              </a>
            </figcaption>
          </figure>
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
        <div className="wrap grid items-center gap-9 py-9 md:grid-cols-[1fr_1.12fr] md:gap-9 md:py-12 xl:gap-14">
                    <div>
            <h2
              id="runway-title"
            >
              Daun di atas
              <br />
              panggung.
            </h2>
            <p className="mt-6 max-w-[540px] text-muted">
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
      <Reveal className="wrap mt-16 md:mt-24">
        <section
          id="pesanan-khusus"
          className="grid gap-9 md:grid-cols-2 md:gap-12 xl:gap-20"
          aria-labelledby="custom-title"
        >
          <div className="photo relative aspect-[4/3] md:aspect-auto md:min-h-[480px] xl:min-h-[580px]">
            <Image
              src={productImage("c262c573-badf-4f69-a5ba-68ec232fdfbb")}
              alt="Cangkir putih bermotif daun jingga dengan ranting daun segar di atas meja kayu"
              fill
              sizes="(max-width: 768px) 90vw, 40vw"
              className="object-cover object-[center_65%]"
            />
          </div>
          <div className="self-center">
            <h2 id="custom-title">Punya ide sendiri?</h2>
            <p className="mt-4 max-w-[520px] text-muted">
              Dari busana hingga tas, ceritakan motif dan bentuk yang kamu
              inginkan. Pilih kainnya, padukan coraknya, lalu diskusikan
              bersama Sak Karepe.
            </p>
            <dl className="my-9 grid gap-4 md:gap-5">
              {[
                ["Kain", "Katun · Sutra · Bemberg"],
                ["Perpaduan", "Tenun ikat · Lurik · Batik"],
                ["Teknik", "Pounding · Steam"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid items-baseline gap-1 sm:grid-cols-[110px_1fr] sm:gap-4"
                >
                  <dt className="text-[15px] text-muted">{label}</dt>
                  <dd className="font-heading text-[22px] leading-tight font-medium tracking-[-.03em] md:text-[28px]">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <Link href="/kontak" className="btn btn-outline">
              Hubungi kami <LinkIcon />
            </Link>
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
              <p className="mt-2 max-w-[370px] text-muted">
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
