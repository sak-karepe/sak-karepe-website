import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, like } from "drizzle-orm";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { orders, orderStatuses } from "@/db/schema";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { isOrderStatus, orderStatusClass, orderStatusLabels } from "@/lib/order-status";
export const metadata: Metadata = { title: "Pesanan" };
export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdminPage();
  const { status: param, q = "" } = await searchParams;
  const status = isOrderStatus(param) ? param : undefined;
  // Angka saja dicocokkan persis ke ID pesanan; selain itu ke potongan kode, mis. "Y7D3" atau "SK-261023".
  const query = q.trim().toUpperCase();
  const search = !query ? undefined : /^\d+$/.test(query) ? eq(orders.id, Number(query)) : like(orders.code, `%${query}%`);
  const [counts, rows] = await Promise.all([
    db.select({ status: orders.status, total: count() }).from(orders).where(search).groupBy(orders.status),
    db.query.orders.findMany({
      where: and(status ? eq(orders.status, status) : undefined, search),
      orderBy: [desc(orders.createdAt), desc(orders.id)],
      with: {
        user: { columns: { name: true, email: true } },
        items: { columns: { productName: true, quantity: true } },
      },
    }),
  ]);
  const countOf = (value?: string) =>
    counts.filter((row) => !value || row.status === value).reduce((sum, row) => sum + row.total, 0);
  const tabHref = (value?: string) => {
    const params = new URLSearchParams({ ...(value && { status: value }), ...(query && { q: query }) });
    return params.size ? `/admin/pesanan?${params}` : "/admin/pesanan";
  };
  const tabs = [{ value: undefined, label: "Semua" }, ...orderStatuses.map((value) => ({ value, label: orderStatusLabels[value] }))];
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Pesanan</h1>
      <p className="mt-2 text-muted">
        {rows.length} pesanan{status && ` ${orderStatusLabels[status].toLowerCase()}`}
        {query && ` untuk "${query}"`}. Pembeli melanjutkan lewat WhatsApp dengan mengutip kode pesanan.
      </p>
      <form action="/admin/pesanan" role="search" className="mt-6 flex max-w-md items-center gap-2">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-line bg-page px-3 focus-within:border-accent">
          <MagnifyingGlassIcon size={18} aria-hidden="true" className="shrink-0 text-muted" />
          <span className="sr-only">Cari ID atau kode pesanan</span>
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="ID atau kode pesanan"
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] focus:outline-none"
          />
        </label>
        <button className="min-h-11 rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent">
          Cari
        </button>
        {query && (
          <Link href={status ? `/admin/pesanan?status=${status}` : "/admin/pesanan"} className="px-2 text-sm text-muted hover:text-ink">
            Reset
          </Link>
        )}
      </form>
      <nav aria-label="Filter status" className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
        {tabs.map((tab) => {
          const active = status === tab.value;
          return (
            <Link
              key={tab.label}
              href={tabHref(tab.value)}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-[15px] ${active ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"}`}
            >
              {tab.label}
              <span className="text-xs tabular-nums text-muted">{countOf(tab.value)}</span>
            </Link>
          );
        })}
      </nav>
      {rows.length === 0 ? (
        <p className="py-16 text-center text-muted">{query ? `Tidak ada pesanan dengan ID atau kode "${query}".` : "Belum ada pesanan di sini."}</p>
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((order) => {
            const [first, ...rest] = order.items;
            const summary = first
              ? `${first.productName} ×${first.quantity}${rest.length ? ` +${rest.length} lainnya` : ""}`
              : "Tanpa produk";
            return (
              <li key={order.id}>
                <Link
                  href={`/admin/pesanan/${order.id}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-4 transition-colors hover:bg-surface/60 md:grid-cols-[170px_minmax(0,1fr)_130px_160px_190px] md:px-2"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[15px] font-medium">{order.code}</p>
                    <p className="text-sm text-muted md:hidden">{formatDateTime(order.createdAt)}</p>
                  </div>
                  <span
                    className={`justify-self-end rounded-full px-2.5 py-1 text-xs whitespace-nowrap md:order-last ${orderStatusClass(order.status)}`}
                  >
                    {orderStatusLabels[order.status]}
                  </span>
                  <div className="col-span-2 min-w-0 md:col-span-1">
                    <p className="truncate">{order.user ? (order.user.name ?? order.user.email) : (order.customerName ?? "Pembeli langsung")}</p>
                    <p className="truncate text-sm text-muted">{summary}</p>
                  </div>
                  <p className="hidden text-[15px] md:block">
                    {order.subtotal === null ? <span className="text-muted">Konsultasi</span> : formatRupiah(order.subtotal)}
                  </p>
                  <p className="hidden text-sm text-muted md:block">{formatDateTime(order.createdAt)}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
