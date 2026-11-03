import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm";
import { ArrowRightIcon, WarningCircleIcon, WalletIcon, PackageIcon, UserIcon, BoxArrowDownIcon, CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { orders, payments, products, users } from "@/db/schema";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { orderStatusClass, orderStatusLabels } from "@/lib/order-status";
import { onHoldMs, stuckOnHoldOrders } from "@/lib/shipments";
export const metadata: Metadata = { title: "Dashboard" };

// Status yang butuh tindakan admin. Dipakai kartu DAN daftar "perlu tindakan",
// jadi angka kartu selalu sama dengan isi list yang dituju (/admin/pesanan?status=...).
const NEEDS_CONFIRM = "menunggu_konfirmasi" as const;
const NEEDS_SHIPPING = "dibayar" as const;
const ACTION_STATUSES = [NEEDS_CONFIRM, NEEDS_SHIPPING];

// Batas bulan berjalan menurut WIB (UTC+7), bukan zona waktu server.
function currentMonthWIB(now = new Date()) {
  const WIB = 7 * 60 * 60 * 1000;
  const local = new Date(now.getTime() + WIB);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  return {
    start: new Date(Date.UTC(y, m, 1) - WIB),
    end: new Date(Date.UTC(y, m + 1, 1) - WIB),
    label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(now),
  };
}

export default async function AdminPage() {
  // Layout tidak dirender ulang di setiap navigasi, jadi halaman tetap memeriksa sesi sendiri.
  const user = await requireAdminPage();
  const month = currentMonthWIB();

  // Pesanan yang pembayarannya masuk bulan ini (payments.paidAt).
  // Lewat subquery id agar pesanan dengan lebih dari satu pembayaran tidak terhitung ganda.
  const paidThisMonth = db
    .select({ id: payments.orderId })
    .from(payments)
    .where(and(gte(payments.paidAt, month.start), lt(payments.paidAt, month.end)));

  const [total, published, toShip, waiting, userTotal, [revenue], recent, onHold, flagged] = await Promise.all([
    db.$count(products),
    // Stok 0 ikut disembunyikan dari toko (lib/catalog).
    db.$count(products, and(eq(products.published, true), or(isNull(products.stock), ne(products.stock, 0)))),
    db.$count(orders, eq(orders.status, NEEDS_SHIPPING)),
    db.$count(orders, eq(orders.status, NEEDS_CONFIRM)),
    db.$count(users),
    // Omzet bulan ini tanpa ongkir. Pesanan dibatalkan tidak dihitung.
    db
      .select({ total: sql<number>`coalesce(sum(${orders.subtotal}), 0)` })
      .from(orders)
      .where(and(inArray(orders.id, paidThisMonth), ne(orders.status, "dibatalkan"))),
    db.query.orders.findMany({
      where: inArray(orders.status, ACTION_STATUSES),
      orderBy: [desc(orders.createdAt), desc(orders.id)],
      limit: 5,
      with: {
        user: { columns: { name: true, email: true } },
        items: { columns: { productName: true, quantity: true } },
      },
    }),
    stuckOnHoldOrders(),
    db.query.orders.findMany({ columns: { id: true, code: true, reviewNote: true }, where: isNotNull(orders.reviewNote), orderBy: orders.id }),
  ]);

  const cards = [
    {
      title: `Pendapatan ${month.label}`,
      value: formatRupiah(Number(revenue?.total ?? 0)),
      href: "/admin/pesanan",
      action: "Lihat pesanan",
      icon: WalletIcon,
      span: "md:col-span-2",
      big: true,
    },
    {
      title: "Perlu dikirim",
      value: toShip,
      href: `/admin/pesanan?status=${NEEDS_SHIPPING}`,
      action: "Lihat pesanan",
      icon: BoxArrowDownIcon,
      span: "",
    },
    {
      title: "Menunggu konfirmasi",
      value: waiting,
      href: `/admin/pesanan?status=${NEEDS_CONFIRM}`,
      action: "Lihat pesanan",
      icon: CheckCircleIcon,
      span: "",
    },
    {
      title: "Pengguna",
      value: userTotal,
      href: "/admin/pengguna",
      action: "Kelola pengguna",
      icon: UserIcon,
      span: "xl:col-span-2",
    },
    {
      title: "Produk",
      value: total,
      href: "/admin/produk",
      action: "Kelola produk",
      icon: PackageIcon,
      span: "xl:col-span-2",
    },
  ];

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <p className="text-sm text-accent">Dashboard</p>
      <h1 className="mt-3 text-3xl tracking-[-.045em] md:text-4xl">Halo, {user.name ?? user.email}.</h1>
      <p className="mt-3 text-muted">Kelola etalase Sak Karepe dari sini.</p>

      {(onHold.length > 0 || flagged.length > 0) && (
        <section aria-labelledby="perlu-dicek" className="mt-10 rounded-2xl border border-danger p-6">
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

      {/* Ringkasan: tiap kartu menuju list yang sudah terfilter */}
      <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan">
        {cards.map(({ icon: Icon, ...card }) => (
          <Link
            key={card.title}
            href={card.href}
            className={`group flex flex-col rounded-2xl border border-line p-6 transition-colors hover:border-accent ${card.span}`}
          >
            <div className="flex items-start justify-between gap-4">
              <h2 className="pt-1 text-[15px] text-muted">{card.title}</h2>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-surface text-accent">
                <Icon size={24} aria-hidden="true" />
              </span>
            </div>
            <p className={`mt-8 tabular-nums tracking-[-.045em] ${card.big ? "text-4xl md:text-5xl" : "text-3xl"}`}>{card.value}</p>
            <p className="mt-auto inline-flex items-center gap-2 pt-6 text-sm text-accent">
              {card.action} <ArrowRightIcon size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
            </p>
          </Link>
        ))}
      </section>

      <section aria-labelledby="perlu-tindakan" className="mt-10 overflow-hidden rounded-2xl border border-line">
        <div className="flex items-baseline justify-between gap-4 border-b border-line px-6 py-5">
          <h2 id="perlu-tindakan" className="text-xl tracking-[-.03em]">
            Pesanan perlu tindakan
          </h2>
          <Link href="/admin/pesanan" className="inline-flex items-center gap-1.5 text-sm text-accent">
            Semua pesanan <ArrowRightIcon size={14} aria-hidden="true" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="px-6 py-14 text-center text-muted">Tidak ada pesanan yang perlu tindakan. Semua beres.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((order) => {
              const [first, ...rest] = order.items;
              const summary = first
                ? `${first.productName} ×${first.quantity}${rest.length ? ` +${rest.length} lainnya` : ""}`
                : "Tanpa produk";
              return (
                <li key={order.id}>
                  <Link
                    href={`/admin/pesanan/${order.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-6 py-4 transition-colors hover:bg-surface/60 md:grid-cols-[180px_minmax(0,1fr)_200px_180px]"
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
                    <p className="hidden text-sm text-muted md:block">{formatDateTime(order.createdAt)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}