import type { Metadata } from "next";
import Image from "@/components/site-image";
import Link from "next/link";
import { Breadcrumb } from "@/components/page-intro";
export const metadata: Metadata = { title: "Masuk · Sak Karepe" };
export default function SignInPage() {
  return (
    <main id="utama" className="wrap pt-8 md:pt-10">
      <Breadcrumb items={[{ label: "Masuk" }]} />
      <section className="mt-8 grid overflow-hidden rounded-md border border-line md:grid-cols-2">
        <div className="relative hidden min-h-[600px] md:block">
          <Image src="/images/products/7e60ced3-8a64-4f26-9237-4cfc0aff6a41.jpeg"
            alt="Ragam busana Sak Karepe di gantungan" fill sizes="45vw" className="object-cover" />
        </div>
        <div className="px-6 py-12 md:px-12 md:py-16 xl:px-16">
          <p className="text-sm text-accent">Selamat datang kembali</p>
          <h1 className="mt-4 text-4xl tracking-[-.05em] md:text-5xl">Masuk.</h1>
          <p className="mt-5 text-muted">Satu tempat untuk melihat pesanan dan karya pilihanmu.</p>
          <div className="mt-9 space-y-6">
            <div><label htmlFor="email" className="mb-2 block text-sm">Email</label>
              <input id="email" type="email" autoComplete="email" placeholder="nama@email.com"
                className="min-h-13 w-full rounded-md border border-line bg-transparent px-4 text-base" /></div>
            <div><label htmlFor="password" className="mb-2 block text-sm">Kata sandi</label>
              <input id="password" type="password" autoComplete="current-password" placeholder="Kata sandi kamu"
                className="min-h-13 w-full rounded-md border border-line bg-transparent px-4 text-base" /></div>
            <button type="button" className="btn w-full">Masuk</button>
          </div>
          <Link href="/koleksi" className="text-link mt-8">Kembali ke koleksi</Link>
        </div>
      </section>
    </main>
  );
}
