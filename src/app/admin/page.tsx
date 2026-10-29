import type { Metadata } from "next";
import Link from "next/link";
import { eq, isNotNull } from "drizzle-orm";
import { ArrowRightIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { onHoldMs, stuckOnHoldOrders } from "@/lib/shipments";
export const metadata: Metadata = { title: "Dashboard" };
export default async function AdminPage() {
  // Layout tidak dirender ulang di setiap navigasi, jadi halaman tetap memeriksa sesi sendiri.
  const user = await requireAdminPage();
  const [total, published, orderTotal, waiting, onHold, flagged] = await Promise.all([
    db.$count(products),
    db.$count(products, eq(products.published, true)),
    db.$count(orders),
    db.$count(orders, eq(orders.status, "menunggu_konfirmasi")),
    stuckOnHoldOrders(),
    db.query.orders.findMany({ columns: { id: true, code: true, reviewNote: true }, where: isNotNull(orders.reviewNote), orderBy: orders.id }),
  ]);
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <p className="text-sm text-accent">Dashboard</p>
      <h1 className="mt-3 text-3xl tracking-[-.045em] md:text-4xl">Halo, {user.name ?? user.email}.</h1>
      <p className="mt-3 text-muted">Kelola etalase Sak Karepe dari sini.</p>
      {(onHold.length > 0 || flagged.length > 0) && (
        <section aria-labelledby="perlu-dicek" className="mt-10 max-w-4xl rounded-md border border-danger p-6">
          <h2 id="perlu-dicek" className="flex items-center gap-2 text-xl tracking-[-.03em] text-danger">
            <WarningCircleIcon size={22} weight="bold" aria-hidden="true" /> Perlu dicek
          </h2>
          {flagged.length > 0 && (
            <>
              <p className="mt-2 text-[15px] text-muted">Pembayaran DOKU yang tidak cocok dengan pesanan. Cocokkan di DOKU Back Office.</p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {flagged.map((order) => (
                  <li key={order.id}>
                    <Link href={`/admin/pesanan/${order.id}`} className="flex justify-between gap-4 py-3 hover:text-accent">
                      <span className="font-mono">{order.code}</span>
                      <span className="text-right text-sm text-muted">{order.reviewNote}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {onHold.length > 0 && (
            <>
              <p className="mt-4 text-[15px] text-muted">
                Paket tertahan kurir (on_hold) lebih dari {onHoldMs / (24 * 60 * 60 * 1000)} hari. Hubungi kurir lewat dashboard Biteship.
              </p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {onHold.map((order) => (
                  <li key={order.id}>
                    <Link href={`/admin/pesanan/${order.id}`} className="flex justify-between gap-4 py-3 hover:text-accent">
                      <span className="font-mono">{order.code}</span>
                      <span className="text-sm text-muted">sejak {formatDateTime(order.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
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
        <Link href="/admin/pesanan" className="group rounded-md border border-line p-6 transition-colors hover:border-accent">
          <h2 className="text-xl tracking-[-.03em]">Pesanan</h2>
          <p className="mt-2 text-[15px] text-muted">
            {orderTotal} pesanan, {waiting} menunggu konfirmasi.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 text-sm text-accent">
            Kelola pesanan <ArrowRightIcon size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
          </p>
        </Link>
      </section>
    </main>
  );
}
