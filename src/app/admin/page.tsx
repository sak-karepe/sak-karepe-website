import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, isAdmin } from "@/auth";
import { signOutAdmin } from "@/lib/auth-actions";
export const metadata: Metadata = { title: "Admin · Sak Karepe", robots: { index: false } };
const sections = [
  { title: "Produk", copy: "Kelola foto, deskripsi, harga, dan ketersediaan karya." },
  { title: "Penjualan", copy: "Catat pesanan dan penjualan yang masuk." },
];
export default async function AdminPage() {
  const session = await auth();
  const user = session?.user;
  if (!user || !isAdmin(user.email)) redirect("/?error=SessionRequired");
  return (
    <main id="utama" className="wrap pt-8 md:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-8">
        <div>
          <p className="text-sm text-accent">Dashboard admin</p>
          <h1 className="mt-4 text-4xl tracking-[-.05em] md:text-5xl">Halo, {user.name ?? user.email}.</h1>
          <p className="mt-4 text-muted">Masuk sebagai {user.email}</p>
        </div>
        <form action={signOutAdmin}>
          <button className="rounded-md border border-line px-4 py-2 text-sm">Keluar</button>
        </form>
      </div>
      <section className="mt-8 grid gap-5 md:grid-cols-2" aria-label="Menu admin">
        {sections.map((section) => (
          <article key={section.title} className="rounded-md border border-line p-6 md:p-8">
            <h2 className="text-2xl tracking-[-.035em]">{section.title}</h2>
            <p className="mt-3 text-muted">{section.copy}</p>
            <p className="mt-6 text-sm text-muted">Segera hadir</p>
          </article>
        ))}
      </section>
    </main>
  );
}
