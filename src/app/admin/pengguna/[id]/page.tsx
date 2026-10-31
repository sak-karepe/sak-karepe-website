import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import {
  ArrowLeftIcon,
  UserIcon,
  MapPinIcon,
  PackageIcon,
} from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { users, addresses, orders } from "@/db/schema";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { orderStatusClass, orderStatusLabels } from "@/lib/order-status";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await db.query.users.findFirst({
    where: eq(users.id, Number(id)),
  });
  return {
    title: user ? `Pengguna: ${user.name ?? user.email}` : "Detail Pengguna",
  };
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();
  const { id } = await params;
  const userId = Number(id);

  if (isNaN(userId)) notFound();

  // Ambil data user beserta alamat dan pesanannya secara paralel
  const [user, userAddresses, userOrders] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, userId) }),
    db.query.addresses.findMany({ where: eq(addresses.userId, userId) }),
    db.query.orders.findMany({
      where: eq(orders.userId, userId),
      orderBy: [desc(orders.createdAt)],
      with: {
        items: { columns: { productName: true, quantity: true } },
      },
    }),
  ]);

  if (!user) notFound();

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12 max-w-5xl mx-auto">
      <Link
        href="/admin/pengguna"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink mb-6"
      >
        <ArrowLeftIcon size={16} />
        Kembali ke Daftar Pengguna
      </Link>

      {/* Header Info Akun */}
      <div className="flex flex-col md:flex-row md:items-center gap-6 pb-8 border-b border-line">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-surface border border-line flex items-center justify-center">
          {user.image ? (
            <Image
              src={user.image}
              alt={user.name ?? "Avatar"}
              fill
              className="object-cover"
            />
          ) : (
            <UserIcon size={36} className="text-muted" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-medium truncate">
              {user.name ?? "Tanpa Nama"}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs uppercase font-medium ${user.role === "admin" ? "bg-accent/10 text-accent" : "bg-surface text-muted border border-line"}`}
            >
              {user.role}
            </span>
          </div>
          <p className="text-muted mt-1">{user.email}</p>
          <p className="text-xs text-muted mt-2">
            Terdaftar sejak {formatDateTime(user.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-8">
        {/* Daftar Alamat */}
        <section>
          <h2 className="text-lg font-medium flex items-center gap-2 mb-4">
            <MapPinIcon size={20} className="text-muted" />
            Daftar Alamat ({userAddresses.length})
          </h2>
          {userAddresses.length === 0 ? (
            <p className="text-sm text-muted p-4 rounded-md border border-line bg-surface/30">
              Pengguna belum menyimpan alamat.
            </p>
          ) : (
            <ul className="space-y-3">
              {userAddresses.map((addr) => (
                <li
                  key={addr.id}
                  className="p-4 rounded-md border border-line bg-surface/30 text-sm space-y-1"
                >
                  <p className="font-medium">
                    {addr.recipientName}{" "}
                    <span className="text-muted font-normal">
                      ({addr.phone})
                    </span>
                  </p>
                  <p className="text-muted">
                    {addr.street}, {addr.village}, {addr.district}, {addr.city},{" "}
                    {addr.province} {addr.postalCode}
                  </p>
                  {addr.notes && (
                    <p className="text-xs text-muted italic">
                      Catatan: {addr.notes}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Statistik Ringkas */}
        <section>
          <h2 className="text-lg font-medium flex items-center gap-2 mb-4">
            <PackageIcon size={20} className="text-muted" />
            Riwayat Pesanan ({userOrders.length})
          </h2>
        </section>
      </div>

      {/* Daftar Pesanan Pengguna */}
      <section className="mt-6">
        {userOrders.length === 0 ? (
          <p className="text-sm text-muted p-4 rounded-md border border-line bg-surface/30">
            Pengguna belum pernah membuat pesanan.
          </p>
        ) : (
          <ul className="divide-y divide-line border-t border-b border-line">
            {userOrders.map((order) => {
              const [first, ...rest] = order.items;
              const summary = first
                ? `${first.productName} ×${first.quantity}${rest.length ? ` +${rest.length} lainnya` : ""}`
                : "Tanpa produk";

              return (
                <li key={order.id}>
                  <Link
                    href={`/admin/pesanan/${order.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-4 transition-colors hover:bg-surface/60 md:grid-cols-[160px_minmax(0,1fr)_140px_160px] md:px-2"
                  >
                    <div>
                      <p className="font-mono text-sm font-medium">
                        {order.code}
                      </p>
                      <p className="text-xs text-muted md:hidden">
                        {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="min-w-0 col-span-2 md:col-span-1">
                      <p className="truncate text-sm">{summary}</p>
                      <p className="truncate text-xs text-muted">
                        {order.subtotal === null
                          ? "Konsultasi"
                          : formatRupiah(order.subtotal)}
                      </p>
                    </div>
                    <span
                      className={`justify-self-end rounded-full px-2.5 py-1 text-xs whitespace-nowrap md:order-last ${orderStatusClass(order.status)}`}
                    >
                      {orderStatusLabels[order.status]}
                    </span>
                    <p className="hidden text-xs text-muted md:block">
                      {formatDateTime(order.createdAt)}
                    </p>
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
