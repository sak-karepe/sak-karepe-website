import { LinkIcon } from "@/components/icons";
import type { Metadata } from "next";
import Image from "@/components/site-image";
import Link from "next/link";
import { runwayPhotos } from "@/lib/content";
import { Breadcrumb } from "@/components/page-intro";
import { Reveal } from "@/components/reveal";
import { contact, whatsappUrl } from "@/lib/contact";
export const metadata: Metadata = {
  title: "Kontak & kunjungan · Sak Karepe",
  description:
    "Hubungi Sak Karepe melalui WhatsApp dan temukan lokasi SLB Khusus Bina Mandiri di Surabaya.",
};
export default function ContactPage() {
  return (
    <main id="utama">
      <section className="wrap pt-8 md:pt-10">
        <Breadcrumb items={[{ label: "Kontak" }]} />
        <div className="mt-9 grid items-center gap-9 lg:grid-cols-2 lg:gap-16">
          <div>
            <h1 className="page-title">
              <span className="hero-title-line">
                <span>Mari bertemu.</span>
              </span>
              <span className="hero-title-line">
                <span>Mari bercerita.</span>
              </span>
            </h1>
            <p className="hero-enter mt-6 max-w-[480px] text-muted md:text-lg">
              Bicarakan pilihan produk, sampaikan ide pesanan, atau rencanakan
              kunjungan untuk melihat karya lebih dekat.
            </p>
          </div>
          <div className="hero-images photo">
            <iframe
              src={contact.embed}
              title="Peta lokasi SLB Khusus Bina Mandiri, Surabaya"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
              className="h-[320px] w-full border-0 lg:h-[420px]"
            />
          </div>
        </div>
      </section>
      <section
        className="wrap stagger mt-16 grid gap-10 md:mt-24 lg:grid-cols-2 lg:gap-16"
        aria-labelledby="find-title"
      >
        <div className="photo aspect-[1088/540] lg:aspect-auto lg:min-h-[420px]">
          <Image
            src="/images/place/depan-sekolah.jpg"
            alt="Depan SLB Khusus Bina Mandiri dengan papan nama dan pagar hijau, Jl. Jemursari XVII No. E1, Surabaya"
            fill
            sizes="(max-width: 1024px) 90vw, 45vw"
            className="object-cover object-[15%_50%]"
          />
        </div>
        <div>
          <h2 id="find-title" className="text-[28px]">
            Temukan kami.
          </h2>
          <address className="mt-4 not-italic">
            <p className="font-medium">{contact.location}</p>
            <p className="mt-2 text-muted">{contact.address}</p>
          </address>
          <a
            className="text-link mt-5"
            href={contact.maps}
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka rute di Google Maps <LinkIcon />
          </a>
          <p className="mt-8 text-sm text-muted">
            Hubungi kami terlebih dahulu untuk membicarakan waktu kunjungan.
          </p>
          <a
            className="mt-3 block text-[28px] font-heading tracking-[-.04em] text-accent"
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
          >
            {contact.phone}
          </a>
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline mt-5"
          >
            Chat di WhatsApp <LinkIcon />
          </a>
        </div>
      </section>
      <Reveal className="wrap mt-16 md:mt-24">
        <section className="rounded-md bg-surface p-8 md:p-12">
          <h2 className="text-[32px] md:text-[42px]">Masih mencari pilihan?</h2>
          <p className="mt-5 max-w-[500px] text-muted">
            Lihat ragam produk ecoprint dan kenali karakter motifnya sebelum
            berbincang bersama kami.
          </p>
          <Link href="/koleksi" className="text-link mt-6">
            Kembali melihat koleksi <LinkIcon />
          </Link>
          <div className="mt-9 grid grid-cols-2 gap-3 md:grid-cols-4 xl:gap-4">
            {runwayPhotos.slice(8, 12).map((photo) => (
              <div key={photo.src} className="photo aspect-[2/3]">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 768px) 45vw, 22vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      </Reveal>
    </main>
  );
}
