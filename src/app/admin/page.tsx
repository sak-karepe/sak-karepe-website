import type { Metadata } from "next";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { products } from "@/db/schema";
export const metadata: Metadata = { title: "Dashboard" };
export default async function AdminPage() {
  // Layout tidak dirender ulang di setiap navigasi, jadi halaman tetap memeriksa sesi sendiri.
  const user = await requireAdminPage();
  const [total, published] = await Promise.all([
    db.$count(products),
    db.$count(products, eq(products.published, true)),
  ]);
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <p className="text-sm text-accent">Dashboard</p>
      <h1 className="mt-3 text-3xl tracking-[-.045em] md:text-4xl">Halo, {user.name ?? user.email}.</h1>
      <p className="mt-3 text-muted">Kelola etalase Sak Karepe dari sini.</p>
      <section className="mt-10 grid max-w-4xl gap-5 md:grid-cols-2" aria-label="Fitur admin">
        <Link href="/admin/produk" className="group rounded-md border border-line p-6 transition-colors hover:border-accent">
          <h2 className="text-xl tracking-[-.03em]">Produk</h2>
          <p className="mt-2 text-[15px] text-muted">
            {total} produk, {published} tampil di website.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 text-sm text-accent">
            Kelola produk <ArrowRightIcon size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </p>
        </Link>
        <article className="rounded-md border border-line p-6">
          <h2 className="text-xl tracking-[-.03em]">Penjualan</h2>
          <p className="mt-2 text-[15px] text-muted">Catat pesanan dan penjualan yang masuk.</p>
          <p className="mt-5 text-xs tracking-wide text-muted uppercase">Segera hadir</p>
        </article>
      </section>
    </main>
  );
}
