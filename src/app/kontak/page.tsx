import { LinkIcon } from "@/components/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/page-intro";
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
      <PageIntro
        label="Kontak"
        title="Mari bertemu."
        accent="Mari bercerita."
        copy="Bicarakan pilihan produk, sampaikan ide pesanan, atau rencanakan kunjungan untuk melihat karya lebih dekat."
      />
      <section className="wrap grid items-start gap-10 md:grid-cols-[.8fr_1.2fr] md:gap-16">
        <div className="space-y-9">
          <div className="border-t border-line pt-6">
            <h2 className="text-[28px]">Hubungi kami.</h2>
            <p className="mt-4 text-muted">
              Untuk pertanyaan koleksi dan pesanan khusus.
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
              className="btn mt-5"
            >
              Chat di WhatsApp <LinkIcon />
            </a>
          </div>
          <div className="border-t border-line pt-6">
            <h2 className="text-[28px]">Temukan kami.</h2>
            <address className="mt-4 not-italic">
              <p className="font-medium">{contact.location}</p>
              <p className="mt-2 max-w-[420px] text-muted">{contact.address}</p>
            </address>
            <p className="mt-4 max-w-[400px] text-sm text-muted">
              Hubungi kami terlebih dahulu untuk membicarakan waktu kunjungan.
            </p>
            <a
              className="text-link mt-5"
              href={contact.maps}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buka rute di Google Maps <LinkIcon />
            </a>
          </div>
        </div>
        <div className="photo">
          <iframe
            src={contact.embed}
            title="Peta lokasi SLB Khusus Bina Mandiri, Surabaya"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
            className="h-[390px] w-full border-0 md:h-[590px]"
          />
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
        </section>
      </Reveal>
    </main>
  );
}
