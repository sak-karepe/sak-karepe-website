import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { currentUserId } from "@/auth";
import { db } from "@/db";
import { orders, orderStatuses } from "@/db/schema";
import { LinkIcon } from "@/components/icons";
import { LoginPrompt } from "@/components/login-prompt";
import { OrdersSearch } from "@/components/orders-search";
import { Breadcrumb } from "@/components/page-intro";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { isOrderStatus, orderStatusClass, orderStatusLabels } from "@/lib/order-status";

export const metadata: Metadata = { title: "Pesanan saya · Sak Karepe", robots: { index: false } };

type OrderStatus = (typeof orderStatuses)[number];
type Group = { key: string; label: string; statuses: readonly OrderStatus[] | null };

// Status teknis dikelompokkan agar mudah dipahami pembeli. `null` = semua status.
// Bertipe OrderStatus: kalau ada nama status yang salah ketik / tidak ada di enum, TypeScript langsung error.
// Status yang belum masuk grup mana pun tetap muncul di tab "Semua".
const GROUPS: readonly Group[] = [
  { key: "semua", label: "Semua", statuses: null },
  { key: "belum-bayar", label: "Belum bayar", statuses: ["menunggu_konfirmasi", "menunggu_checkout", "menunggu_pembayaran"] },
  { key: "diproses", label: "Diproses", statuses: ["dibayar"] },
  { key: "dikirim", label: "Dikirim", statuses: ["dikirim", "gagal_kirim", "sampai"] },
  { key: "selesai", label: "Selesai", statuses: ["selesai"] },
  { key: "dibatalkan", label: "Dibatalkan", statuses: ["dibatalkan"] },
];

function tabHref(key: string, q: string) {
  const params = new URLSearchParams({ ...(key !== "semua" && { status: key }), ...(q && { q }) });
  return params.size ? `/pesanan?${params}` : "/pesanan";
}

export default async function MyOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status: param, q: rawQ } = await searchParams;
  // Cegah nilai non-string (mis. ?q=a&q=b) dan batasi panjang.
  const q = (typeof rawQ === "string" ? rawQ : "").trim().slice(0, 80);
  const statusParam = typeof param === "string" ? param : "";

  // `status` boleh berupa kunci grup, atau satu status mentah yang valid (pola isOrderStatus seperti di admin).
  const group = GROUPS.find((g) => g.key === statusParam);
  const rawStatus = !group && isOrderStatus(statusParam) ? statusParam : undefined;
  const allowed: readonly OrderStatus[] | null = group ? group.statuses : rawStatus ? [rawStatus] : null;
  const activeKey = group?.key ?? (rawStatus ? (GROUPS.find((g) => g.statuses?.includes(rawStatus))?.key ?? "semua") : "semua");

  const userId = await currentUserId();
  // Query SELALU dibatasi userId milik sesi; filter & pencarian hanya menyaring hasil ini.
  const userRows = userId
    ? await db.query.orders.findMany({
        where: eq(orders.userId, userId),
        orderBy: [desc(orders.createdAt), desc(orders.id)],
        with: { items: { columns: { productName: true, quantity: true } } },
      })
    : [];

  const needle = q.toLowerCase();
  const searched = needle
    ? userRows.filter(
        (o) => o.code.toLowerCase().includes(needle) || o.items.some((i) => i.productName.toLowerCase().includes(needle)),
      )
    : userRows;

  // Angka tab mengikuti pencarian aktif, jadi sama dengan jumlah hasil bila tab diklik.
  const countOf = (g: Group) => (g.statuses ? searched.filter((o) => g.statuses!.includes(o.status)).length : searched.length);
  const rows = allowed ? searched.filter((o) => allowed.includes(o.status)) : searched;
  const filtering = Boolean(q) || activeKey !== "semua";

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
      ) : userRows.length === 0 ? (
        <div className="mt-6 max-w-md">
          <p className="text-muted">Belum ada pesanan. Pilih produk di koleksi, lalu tekan “Beli sekarang”.</p>
          <Link href="/koleksi" className="text-link mt-6">
            Lihat koleksi <LinkIcon />
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 max-w-xl text-muted">
            {userRows.length} pesanan. Harga dikonfirmasi Sak Karepe lewat WhatsApp; alamat dan ongkos kirim diisi saat checkout.
          </p>

          <OrdersSearch initialQ={q} status={activeKey !== "semua" ? statusParam : ""} />

          <nav aria-label="Filter status" className="mt-8 flex gap-6 overflow-x-auto border-b border-line">
            {GROUPS.map((g) => {
              const active = g.key === activeKey;
              return (
                <Link
                  key={g.key}
                  href={tabHref(g.key, q)}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-1 py-3 text-[15px] ${active ? "border-accent font-medium" : "border-transparent text-muted hover:text-ink"}`}
                >
                  {g.label}
                  <span className="text-xs tabular-nums text-muted">{countOf(g)}</span>
                </Link>
              );
            })}
          </nav>

          {rows.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted">{q ? `Tidak ada pesanan dengan kode atau produk “${q}”.` : "Belum ada pesanan di status ini."}</p>
              {filtering && (
                <Link href="/pesanan" className="text-link mt-4 justify-center">
                  Reset filter <LinkIcon />
                </Link>
              )}
            </div>
          ) : (
            <>
              {filtering && (
                <p className="mt-6 text-sm text-muted" aria-live="polite">
                  {rows.length} pesanan ditemukan
                </p>
              )}
              <ul className="mt-4 grid gap-2">
                {rows.map((order) => {
                  const [firstItem, ...rest] = order.items;
                  const summary = firstItem
                    ? `${firstItem.productName} ×${firstItem.quantity}${rest.length ? ` +${rest.length} lainnya` : ""}`
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
        </>
      )}
    </main>
  );
}