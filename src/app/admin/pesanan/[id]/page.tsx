import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowSquareOutIcon, WhatsappLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { orders, orderStatuses } from "@/db/schema";
import { AdminBack } from "@/components/admin-back";
import { CheckoutLinkDialog, CopyCheckoutLink } from "@/components/checkout-link-dialog";
import { ShipmentForm } from "@/components/shipment-forms";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { bookShipment, createCheckoutLink, updateOrderStatus } from "@/lib/order-actions";
import { checkoutStatuses, orderStatusClass, orderStatusLabels, shipmentStatusLabels } from "@/lib/order-status";
import { isActivePayment } from "@/lib/payments";
export const metadata: Metadata = { title: "Detail pesanan" };
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, id),
    with: { user: true, items: true, payments: { orderBy: (payment, { desc }) => [desc(payment.id)], limit: 1 } },
  });
  if (!order) notFound();
  const [payment] = order.payments;
  // Harga bisa diubah selama belum dibayar; link DOKU yang masih berlaku ikut dibatalkan.
  const canPrice = checkoutStatuses.includes(order.status) && !payment?.paidAt;
  const total = order.subtotal === null ? null : order.subtotal + (order.shippingCost ?? 0);
  // Nomor disimpan sebagai 08..., wa.me butuh 628...; kosong sebelum pembeli checkout.
  const buyerWhatsapp =
    order.phone &&
    `https://wa.me/${order.phone.replace(/^0/, "62")}?text=${encodeURIComponent(`Halo ${order.recipientName}, kami dari Sak Karepe tentang pesanan ${order.code}.`)}`;
  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack href="/admin/pesanan" label="Semua pesanan" />
      <div className="mt-4 mb-8 flex max-w-5xl flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl tracking-[-.04em] md:text-4xl">{order.code}</h1>
          <p className="mt-2 text-sm text-muted">
            ID pesanan {order.id} · dibuat {formatDateTime(order.createdAt)}
            {order.updatedAt > order.createdAt && ` · diubah ${formatDateTime(order.updatedAt)}`}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm ${orderStatusClass(order.status)}`}>
          {orderStatusLabels[order.status]}
        </span>
      </div>
      <div className="grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-10">
          <section aria-labelledby="produk">
            <h2 id="produk" className="text-xl tracking-[-.03em]">Produk</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 py-3.5">
                  <div className="min-w-0">
                    {item.productId ? (
                      <Link href={`/admin/produk/${item.productId}`} className="hover:text-accent hover:underline">
                        {item.productName}
                      </Link>
                    ) : (
                      <p>{item.productName}</p>
                    )}
                    <p className="text-sm text-muted">
                      {item.quantity} × {item.price === null ? "harga konsultasi" : formatRupiah(item.price)}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums">
                    {item.price === null ? <span className="text-muted">—</span> : formatRupiah(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex justify-between gap-4">
              Subtotal
              <span className="tabular-nums">
                {order.subtotal === null ? <span className="text-muted">Perlu konsultasi harga</span> : formatRupiah(order.subtotal)}
              </span>
            </p>
            {order.shippingCost === null ? (
              <p className="mt-1 text-sm text-muted">Ongkos kirim dihitung saat pembeli checkout.</p>
            ) : (
              <>
                <p className="mt-1 flex justify-between gap-4 text-muted">
                  <span>Ongkos kirim{order.courierName && ` · ${order.courierName}`}</span>
                  <span className="tabular-nums">{formatRupiah(order.shippingCost)}</span>
                </p>
                {total !== null && (
                  <p className="mt-3 flex justify-between gap-4 border-t border-line pt-3 font-medium">
                    Total <span className="tabular-nums">{formatRupiah(total)}</span>
                  </p>
                )}
              </>
            )}
          </section>
          <section aria-labelledby="catatan">
            <h2 id="catatan" className="text-xl tracking-[-.03em]">Catatan pembeli</h2>
            <p className="mt-3 whitespace-pre-line text-[15px] text-muted">{order.notes || "Tidak ada catatan."}</p>
          </section>
        </div>
        <aside className="grid content-start gap-8">
          {(canPrice || payment) && (
            <section aria-labelledby="pembayaran" className="rounded-md border border-line p-5">
              <h2 id="pembayaran" className="text-sm font-medium">Checkout & pembayaran</h2>
              {order.status === "menunggu_checkout" ? (
                <p className="mt-2 text-[15px] text-muted">Link checkout sudah dibuat. Menunggu pembeli mengisi alamat dan membuat pembayaran.</p>
              ) : payment ? (
                <div className="mt-2">
                  <p className="text-lg tabular-nums">{formatRupiah(payment.amount)}</p>
                  {payment.paidAt ? (
                    <p className="text-sm text-accent">
                      Lunas {formatDateTime(payment.paidAt)}
                      {payment.channel && ` · ${payment.channel.replaceAll("_", " ")}`}
                    </p>
                  ) : payment.cancelledAt ? (
                    <p className="text-sm text-muted">Link dibatalkan {formatDateTime(payment.cancelledAt)}</p>
                  ) : (
                    <p className="text-sm text-muted">
                      {payment.expiresAt < new Date() ? "Link kedaluwarsa" : "Link berlaku sampai"} {formatDateTime(payment.expiresAt)}
                    </p>
                  )}
                  <a
                    href={payment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-[15px] text-accent hover:underline"
                  >
                    Buka link DOKU <ArrowSquareOutIcon size={16} aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <p className="mt-2 text-[15px] text-muted">
                  Buat link checkout setelah harga disepakati. Pembeli mengisi alamat di sana, lalu link DOKU dibuat otomatis.
                </p>
              )}
              {canPrice && (
                <div className="mt-4 grid gap-2">
                  {(order.status === "menunggu_checkout" || (order.status === "menunggu_pembayaran" && !(payment && isActivePayment(payment)))) && (
                    <CopyCheckoutLink code={order.code} />
                  )}
                  <CheckoutLinkDialog
                    action={createCheckoutLink.bind(null, order.id)}
                    label={order.status === "menunggu_konfirmasi" ? "Buat link checkout" : "Ubah harga"}
                    items={order.items.map((item) => ({ id: item.id, name: item.productName, quantity: item.quantity, price: item.price }))}
                    code={order.code}
                  />
                </div>
              )}
            </section>
          )}
          {(order.shipmentId || order.status === "dibayar") && (
            <section aria-labelledby="resi" className="rounded-md border border-line p-5">
              <h2 id="resi" className="text-sm font-medium">Resi pengiriman</h2>
              {order.shipmentId ? (
                <div className="mt-2">
                  <p className="font-mono text-lg">{order.waybillId ?? "Menunggu resi dari kurir"}</p>
                  <p className="text-sm text-muted">
                    {order.courierName} · {order.collectionMethod === "drop_off" ? "Antar ke agen kurir" : "Kurir menjemput"}
                  </p>
                  {order.shipmentStatus && (
                    <p className="mt-2 text-[15px]">
                      {shipmentStatusLabels[order.shipmentStatus] ?? order.shipmentStatus}
                      <span className="text-muted"> · {order.shipmentStatus}</span>
                    </p>
                  )}
                  {(!order.shipmentStatus || order.shipmentStatus === "confirmed") && order.status === "dikirim" && (
                    <p className="mt-2 text-[15px] text-muted">
                      {order.collectionMethod === "drop_off"
                        ? "Bawa paket beserta resi ke agen kurir. Status berubah otomatis setelah paket diterima kurir."
                        : "Siapkan paket beserta resi. Status berubah otomatis setelah kurir mengambil paket."}
                    </p>
                  )}
                  {/* Biteship tidak membuka API label di paket kami; label dicetak dari halaman pesanan di dashboard Biteship. */}
                  <a
                    href={`https://dashboard.biteship.com/orders/details/${order.shipmentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn mt-4 min-h-11 w-full gap-2 px-4 text-[15px]"
                  >
                    Cetak resi di Biteship <ArrowSquareOutIcon size={16} aria-hidden="true" />
                  </a>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-[15px] text-muted">Pesan {order.courierName ?? "kurir"} pilihan pembeli untuk mendapatkan resi.</p>
                  <ShipmentForm action={bookShipment.bind(null, order.id)} />
                </>
              )}
            </section>
          )}
          <form action={updateOrderStatus.bind(null, order.id)} className="rounded-md border border-line p-5">
            <label htmlFor="status" className="text-sm font-medium">Status pesanan</label>
            <select
              id="status"
              name="status"
              defaultValue={order.status}
              className="mt-2 w-full rounded-md border border-line bg-page px-3 py-2.5 text-[15px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {orderStatuses.map((value) => (
                <option key={value} value={value}>
                  {orderStatusLabels[value]}
                </option>
              ))}
            </select>
            <button className="mt-3 min-h-11 w-full rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent">
              Simpan status
            </button>
          </form>
          <section aria-labelledby="pengiriman">
            <h2 id="pengiriman" className="text-sm font-medium">Kirim ke</h2>
            {buyerWhatsapp ? (
              <>
                <p className="mt-2">{order.recipientName}</p>
                <p className="text-[15px] text-muted">{order.phone}</p>
                <p className="mt-2 text-[15px] leading-relaxed">
                  {order.shippingAddress} {order.postalCode}
                </p>
                <a
                  href={buyerWhatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[15px] text-accent hover:underline"
                >
                  <WhatsappLogoIcon size={18} aria-hidden="true" /> Chat penerima
                </a>
              </>
            ) : (
              <p className="mt-2 text-[15px] text-muted">Pembeli belum mengisi alamat.</p>
            )}
          </section>
          <section aria-labelledby="akun" className="border-t border-line pt-6">
            <h2 id="akun" className="text-sm font-medium">Akun pembeli</h2>
            <p className="mt-2">{order.user.name ?? "Tanpa nama"}</p>
            <p className="truncate text-[15px] text-muted">{order.user.email}</p>
            <p className="mt-1 text-sm text-muted">ID pembeli {order.user.id}</p>
          </section>
        </aside>
      </div>
    </main>
  );
}
