import type { Metadata } from "next";
import Link from "next/link";
import { and, count, desc, eq, gte, like, lte, or } from "drizzle-orm";
import { MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { orders, orderStatuses, users } from "@/db/schema";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { isOrderStatus, orderStatusClass, orderStatusLabels } from "@/lib/order-status";

export const metadata: Metadata = { title: "Pesanan" };

const ORDERS_PER_PAGE = 15;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string; user?: string; dari?: string; sampai?: string }>;
}) {
  await requireAdminPage();
  const { status: param, q = "", page: pageParam, user: userParam, dari, sampai } = await searchParams;

  const status = isOrderStatus(param) ? param : undefined;
  const query = q.trim();
  const upperQuery = query.toUpperCase();
  const userId = userParam ? Number(userParam) : undefined;
  const currentPage = Number(pageParam) > 0 ? Number(pageParam) : 1;
  const offset = (currentPage - 1) * ORDERS_PER_PAGE;

  // 1. Kondisi Filter User ID
  const userCondition = userId && !isNaN(userId) ? eq(orders.userId, userId) : undefined;

  // 2. Kondisi Filter Tanggal menggunakan objek Date
  const dariDate = dari ? new Date(`${dari}T00:00:00`) : undefined;
  const sampaiDate = sampai ? new Date(`${sampai}T23:59:59`) : undefined;

  const dateCondition = and(
    dariDate ? gte(orders.createdAt, dariDate) : undefined,
    sampaiDate ? lte(orders.createdAt, sampaiDate) : undefined
  );

  const statusCondition = status ? eq(orders.status, status as typeof orderStatuses[number]) : undefined;

  const getSearchCondition = () => {
    if (!query) return undefined;
    const isNum = /^\d+$/.test(query);
    if (isNum) {
      return or(eq(orders.id, Number(query)), like(orders.customerPhone, `%${query}%`));
    }
    return or(
      like(orders.code, `%${upperQuery}%`),
      like(orders.customerName, `%${query}%`),
      like(orders.customerPhone, `%${query}%`),
      like(users.name, `%${query}%`),
      like(users.email, `%${query}%`)
    );
  };

  const searchCondition = getSearchCondition();

  const currentWhere = and(statusCondition, userCondition, dateCondition, searchCondition);
  const baseWhereForTabs = and(userCondition, dateCondition, searchCondition);

  // Ambil counts untuk tab, total row terfilter, dan data rows secara paralel
  const [counts, totalResult, rows] = await Promise.all([
    db
      .select({ status: orders.status, total: count() })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(baseWhereForTabs)
      .groupBy(orders.status),
    db
      .select({ total: count() })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(currentWhere),
    db.query.orders.findMany({
      where: (orders, { and, eq, or, like }) => {
        const conds = [];
        if (statusCondition) conds.push(statusCondition);
        if (userCondition) conds.push(userCondition);
        if (dateCondition) conds.push(dateCondition);
        if (query) {
          const isNum = /^\d+$/.test(query);
          if (isNum) {
            conds.push(or(eq(orders.id, Number(query)), like(orders.customerPhone, `%${query}%`)));
          } else {
            conds.push(
              or(
                like(orders.code, `%${upperQuery}%`),
                like(orders.customerName, `%${query}%`),
                like(orders.customerPhone, `%${query}%`)
              )
            );
          }
        }
        return and(...conds);
      },
      orderBy: [desc(orders.createdAt), desc(orders.id)],
      limit: ORDERS_PER_PAGE,
      offset: offset,
      with: {
        user: { columns: { name: true, email: true } },
        items: { columns: { productName: true, quantity: true } },
      },
    }),
  ]);

  const totalOrders = totalResult[0]?.total ?? 0;
  const totalPages = Math.ceil(totalOrders / ORDERS_PER_PAGE);

  const countOf = (value?: string) =>
    counts.filter((row) => !value || row.status === value).reduce((sum, row) => sum + row.total, 0);

  const buildParams = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    if (userId) params.set("user", String(userId));
    if (dari) params.set("dari", dari);
    if (sampai) params.set("sampai", sampai);

    for (const [key, val] of Object.entries(newParams)) {
      if (val) params.set(key, val);
      else params.delete(key);
    }
    return params.size ? `/admin/pesanan?${params}` : "/admin/pesanan";
  };

  const tabs = [{ value: undefined, label: "Semua" }, ...orderStatuses.map((value) => ({ value, label: orderStatusLabels[value] }))];
  const hasActiveFilters = Boolean(query || status || userId || dari || sampai);

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Pesanan</h1>
      <Link href="/admin/pesanan/import" className="mt-4 inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm hover:border-accent">
        Import transaksi lama
      </Link>
      <p className="mt-2 text-muted">
        {totalOrders} pesanan{status && ` ${orderStatusLabels[status].toLowerCase()}`}
        {query && ` untuk pencarian "${query}"`}. Pembeli melanjutkan lewat WhatsApp dengan mengutip kode pesanan.
      </p>

      <form action="/admin/pesanan" method="GET" className="mt-6 space-y-4 max-w-3xl">
        {status && <input type="hidden" name="status" value={status} />}
        {userId && <input type="hidden" name="user" value={userId} />}

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <label className="flex min-h-11 flex-1 w-full items-center gap-2 rounded-md border border-line bg-page px-3 focus-within:border-accent">
            <MagnifyingGlassIcon size={18} aria-hidden="true" className="shrink-0 text-muted" />
            <span className="sr-only">Cari ID, kode, nama, atau telepon pembeli</span>
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Cari ID, kode, nama, atau telepon pembeli"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-2 text-[15px] focus:outline-none"
            />
          </label>
          <button className="min-h-11 w-full sm:w-auto rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent">
            Cari
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted">Periode:</span>
          <input
            type="date"
            name="dari"
            defaultValue={dari}
            className="rounded-md border border-line bg-page px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <span className="text-muted">s/d</span>
          <input
            type="date"
            name="sampai"
            defaultValue={sampai}
            className="rounded-md border border-line bg-page px-3 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
          <button type="submit" className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:border-accent">
            Terapkan Filter
          </button>
          {hasActiveFilters && (
            <Link href="/admin/pesanan" className="inline-flex items-center gap-1 text-muted hover:text-ink font-medium">
              <XIcon size={16} /> Reset Semua Filter
            </Link>
          )}
        </div>
      </form>

      <nav aria-label="Filter status" className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
        {tabs.map((tab) => {
          const active = status === tab.value;
          return (
            <Link
              key={tab.label}
              href={buildParams({ status: tab.value, page: undefined })}
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
        <p className="py-16 text-center text-muted">
          {hasActiveFilters ? "Tidak ada pesanan yang sesuai dengan filter atau pencarian." : "Belum ada pesanan di sini."}
        </p>
      ) : (
        <>
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
                      <p className="truncate">
                        {order.user ? (order.user.name ?? order.user.email) : (order.customerName ?? "Pembeli langsung")}
                      </p>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-8 pt-4 border-t border-line px-2">
              <p className="text-sm text-muted">
                Halaman {currentPage} dari {totalPages} (Total {totalOrders} pesanan)
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 ? (
                  <Link
                    href={buildParams({ page: String(currentPage - 1) })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-line hover:border-accent hover:text-accent transition-colors"
                  >
                    <CaretLeftIcon size={16} /> Sebelumnya
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-line opacity-50 cursor-not-allowed">
                    <CaretLeftIcon size={16} /> Sebelumnya
                  </span>
                )}

                {currentPage < totalPages ? (
                  <Link
                    href={buildParams({ page: String(currentPage + 1) })}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-line hover:border-accent hover:text-accent transition-colors"
                  >
                    Selanjutnya <CaretRightIcon size={16} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-line opacity-50 cursor-not-allowed">
                    Selanjutnya <CaretRightIcon size={16} />
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}