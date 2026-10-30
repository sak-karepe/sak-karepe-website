import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { currentUserId } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { LinkIcon } from "@/components/icons";
import { LoginPrompt } from "@/components/login-prompt";
import { Breadcrumb } from "@/components/page-intro";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { orderStatusClass, orderStatusLabels } from "@/lib/order-status";
export const metadata: Metadata = { title: "Pesanan saya · Sak Karepe", robots: { index: false } };
export default async function MyOrdersPage() {
  const userId = await currentUserId();
  const rows = userId
    ? await db.query.orders.findMany({
        where: eq(orders.userId, userId),
        orderBy: [desc(orders.createdAt), desc(orders.id)],
        with: { items: { columns: { productName: true, quantity: true } } },
      })
    : [];
  return (
    <main id="utama" className="wrap pt-8 pb-20 md:pt-10">
      <Breadcrumb items={[{ label: "Pesanan saya" }]} />
      <h1 className="mt-8 text-[40px] tracking-[-.045em] md:text-[56px]">Pesanan saya</h1>
      {!userId ? (
        <div className="mt-6 max-w-md">
          <p className="text-muted">Masuk dengan akun Google yang dipakai saat memesan untuk melihat pesananmu.</p>
          <div className="mt-6">
            <LoginPrompt notice="Masuk untuk melihat pesananmu." redirectTo="/pesanan" />
          </div>
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-6 max-w-md">
          <p className="text-muted">Belum ada pesanan. Pilih produk di koleksi, lalu tekan “Beli sekarang”.</p>
          <Link href="/koleksi" className="text-link mt-6">
            Lihat koleksi <LinkIcon />
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-xl text-muted">
            {rows.length} pesanan. Harga dikonfirmasi Sak Karepe lewat WhatsApp; alamat dan ongkos kirim diisi saat checkout.
          </p>
          <ul className="mt-10 grid gap-2">
            {rows.map((order) => {
              const [first, ...rest] = order.items;
              const summary = first
                ? `${first.productName} ×${first.quantity}${rest.length ? ` +${rest.length} lainnya` : ""}`
                : "Tanpa produk";
              const total = order.subtotal === null ? null : order.subtotal + (order.shippingCost ?? 0);
              return (
                <li key={order.id}>
                  <Link
                    href={`/pesanan/${order.code}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-md bg-surface px-4 py-5 transition-colors hover:bg-line/60 md:grid-cols-[190px_minmax(0,1fr)_150px_190px] md:px-5"
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium tabular-nums">{order.code}</p>
                      <p className="text-sm text-muted">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <span
                      className={`justify-self-end rounded-full px-2.5 py-1 text-xs whitespace-nowrap md:order-last ${orderStatusClass(order.status)}`}
                    >
                      {orderStatusLabels[order.status]}
                    </span>
                    <p className="col-span-2 truncate md:col-span-1">{summary}</p>
                    <p className="col-span-2 text-[15px] tabular-nums md:col-span-1">
                      {total === null ? <span className="text-muted">Menunggu harga</span> : formatRupiah(total)}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
