import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { and, count, desc, eq, like, or, sql } from "drizzle-orm";
import { MagnifyingGlassIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { users, orders, addresses } from "@/db/schema";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Pengguna" };

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminPage();
  const { q = "" } = await searchParams;

  const query = q.trim();
  const upperQuery = query.toUpperCase();

  // Pencarian: Jika angka, cocokkan ID. Jika teks, cari di nama atau email.
  const search = !query
    ? undefined
    : /^\d+$/.test(query)
      ? eq(users.id, Number(query))
      : or(like(users.name, `%${query}%`), like(users.email, `%${query}%`));

  // Ambil data pengguna beserta total pesanan mereka
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      createdAt: users.createdAt,
      orderCount: count(orders.id),
    })
    .from(users)
    .leftJoin(orders, eq(users.id, orders.userId))
    .where(search)
    .groupBy(users.id)
    .orderBy(desc(users.createdAt), desc(users.id));

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Pengguna</h1>
      <p className="mt-2 text-muted">
        {rows.length} pengguna terdaftar{query && ` untuk pencarian "${query}"`}
        .
      </p>

      <form
        action="/admin/pengguna"
        role="search"
        className="mt-6 flex max-w-md items-center gap-2"
      >
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-line bg-page px-3 focus-within:border-accent">
          <MagnifyingGlassIcon
            size={18}
            aria-hidden="true"
            className="shrink-0 text-muted"
          />
          <span className="sr-only">Cari ID, nama, atau email pengguna</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="ID, nama, atau email"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] focus:outline-none"
          />
        </label>
        <button className="min-h-11 rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent">
          Cari
        </button>
        {query && (
          <Link
            href="/admin/pengguna"
            className="px-2 text-sm text-muted hover:text-ink"
          >
            Reset
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted">
          {query
            ? `Tidak ada pengguna dengan pencarian "${query}".`
            : "Belum ada pengguna terdaftar."}
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-line">
          {rows.map((user) => (
            <li key={user.id}>
              <Link
                href={`/admin/pengguna/${user.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 transition-colors hover:bg-surface/60 md:grid-cols-[minmax(0,2fr)_120px_140px_160px] md:px-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-surface border border-line flex items-center justify-center">
                    {user.image ? (
                      <Image
                        src={user.image}
                        alt={user.name ?? "Avatar"}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <UserIcon size={20} className="text-muted" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {user.name ?? "Tanpa Nama"}
                    </p>
                    <p className="text-sm text-muted truncate">{user.email}</p>
                  </div>
                </div>

                <div className="justify-self-end md:justify-self-start">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs uppercase font-medium ${user.role === "admin" ? "bg-accent/10 text-accent" : "bg-surface text-muted border border-line"}`}
                  >
                    {user.role}
                  </span>
                </div>

                <p className="hidden text-sm text-muted md:block">
                  {user.orderCount} pesanan
                </p>

                <p className="hidden text-sm text-muted md:block">
                  {formatDateTime(user.createdAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
