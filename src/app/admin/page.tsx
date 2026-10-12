import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/auth";
export const metadata: Metadata = { title: "Dashboard" };
const sections = [
  { title: "Produk", copy: "Kelola foto, deskripsi, harga, dan ketersediaan karya." },
  { title: "Penjualan", copy: "Catat pesanan dan penjualan yang masuk." },
];
export default async function AdminPage() {
  // Layout tidak dirender ulang di setiap navigasi, jadi halaman tetap memeriksa sesi sendiri.
  const user = (await auth())?.user;
  if (!user || !isAdmin(user.email)) redirect("/?error=SessionRequired");
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <p className="text-sm text-accent">Dashboard</p>
      <h1 className="mt-3 text-3xl tracking-[-.045em] md:text-4xl">Halo, {user.name ?? user.email}.</h1>
      <p className="mt-3 text-muted">Ringkasan pengelolaan Sak Karepe akan tampil di sini.</p>
      <section className="mt-10 grid max-w-4xl gap-5 md:grid-cols-2" aria-label="Fitur admin">
        {sections.map((section) => (
          <article key={section.title} className="rounded-md border border-line p-6">
            <h2 className="text-xl tracking-[-.03em]">{section.title}</h2>
            <p className="mt-2 text-[15px] text-muted">{section.copy}</p>
            <p className="mt-5 text-xs text-muted uppercase tracking-wide">Segera hadir</p>
          </article>
        ))}
      </section>
    </main>
  );
}
