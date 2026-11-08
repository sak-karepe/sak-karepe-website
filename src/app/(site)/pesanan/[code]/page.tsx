import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowSquareOutIcon, WhatsappLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { currentUserId } from "@/auth";
import { db } from "@/db";
import { orders, type Order } from "@/db/schema";
import { CancelOrder } from "@/components/cancel-order";
import { ChangeOrderAddress } from "@/components/change-order-address";
import { LoginPrompt } from "@/components/login-prompt";
import { ConfirmReceived } from "@/components/shipment-forms";
import { Breadcrumb } from "@/components/page-intro";
import { cancelOrder, confirmReceived } from "@/lib/checkout-actions";
import { whatsappUrl } from "@/lib/contact";
import { formatDateTime, formatRupiah } from "@/lib/format";
import {
  checkoutStatuses,
  handedOverStatuses,
  orderStatusClass,
  orderStatusLabels,
  shipmentStatusLabels,
} from "@/lib/order-status";
import { isActivePayment } from "@/lib/payments";
export const metadata: Metadata = { title: "Detail pesanan · Sak Karepe", robots: { index: false } };

const statusHints: Record<Order["status"], string> = {
  menunggu_konfirmasi: "Sak Karepe sedang mengonfirmasi harga lewat WhatsApp.",
  menunggu_checkout: "Harga sudah disepakati. Isi alamat pengiriman untuk menghitung ongkos kirim, lalu bayar.",
  menunggu_pembayaran: "Selesaikan pembayaran lewat link di bawah.",
  dibayar: "Pembayaran diterima. Pesanan sedang disiapkan.",
  dikirim: "Pesanan sudah diserahkan ke kurir. Ikuti perjalanannya di kotak Pengiriman.",
  gagal_kirim: "Pengiriman gagal dan paket dikembalikan kurir. Hubungi Sak Karepe lewat WhatsApp untuk kirim ulang atau refund.",
  sampai: "Kurir melaporkan pesanan sudah sampai. Konfirmasi bila sudah diterima; pesanan otomatis selesai 2 hari setelah sampai.",
  retur: "Komplain sedang ditinjau Sak Karepe.",
  selesai: "Pesanan selesai. Terima kasih sudah berbelanja di Sak Karepe.",
  refund: "Pesanan dibatalkan. Dana sedang dikembalikan.",
  dibatalkan: "Pesanan ini dibatalkan.",
};

export default async function MyOrderPage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code).toUpperCase();
  const userId = await currentUserId();
  if (!userId)
    return (
      <main id="utama" className="wrap pt-8 pb-20 md:pt-10">
        <Breadcrumb items={[{ label: "Pesanan saya", href: "/pesanan" }, { label: code }]} />
        <h1 className="mt-8 text-[32px] tracking-[-.04em] tabular-nums md:text-[44px]">{code}</h1>
        <p className="mt-4 max-w-md text-muted">Masuk dengan akun Google yang dipakai saat memesan untuk melihat pesanan ini.</p>
        <div className="mt-6">
          <LoginPrompt notice="Masuk untuk melihat pesananmu." redirectTo={`/pesanan/${code}`} />
        </div>
      </main>
    );
  // Pesanan milik akun lain diperlakukan seperti tidak ada.
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.code, code), eq(orders.userId, userId)),
    with: {
      items: true,
      payments: { orderBy: (payment, { asc }) => [asc(payment.id)] },
      // Alasan pembatalan otomatis; catatan admin di riwayat bersifat internal.
      events: { columns: { note: true }, where: (event, { and, eq }) => and(eq(event.toStatus, "dibatalkan"), eq(event.source, "sistem")), limit: 1 },
    },
  });
  if (!order) notFound();
  const paidPayments = order.payments.filter((payment): payment is typeof payment & { paidAt: Date } => payment.paidAt !== null);
  const totalPaid = paidPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const activePayment = order.payments.find((payment) => isActivePayment(payment));
  const latestPayment = order.payments[order.payments.length - 1];
  const waiting = checkoutStatuses.includes(order.status);
  const payable = order.status === "menunggu_pembayaran" && Boolean(activePayment);
  // Checkout dibuka lagi bila link DOKU sebelumnya kedaluwarsa atau dibatalkan dan belum ada pembayaran yang lunas.
  const checkout = (order.status === "menunggu_checkout" || order.status === "menunggu_pembayaran") && !payable && paidPayments.length === 0;
  const handedOver = handedOverStatuses.includes(order.shipmentStatus ?? "");
  // Setelah sampai atau dikonfirmasi pembeli, status Biteship terakhir (mis. "picked") tidak lagi relevan.
  const shipmentLabel =
    order.status === "sampai" || order.status === "selesai"
      ? shipmentStatusLabels.delivered
      : (shipmentStatusLabels[order.shipmentStatus ?? "confirmed"] ?? "Diproses kurir");
  const total = order.subtotal === null ? null : order.subtotal + (order.shippingCost ?? 0);
  return (
    <main id="utama" className="wrap pt-8 pb-20 md:pt-10">
      <Breadcrumb items={[{ label: "Pesanan saya", href: "/pesanan" }, { label: order.code }]} />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[32px] tracking-[-.04em] tabular-nums md:text-[44px]">{order.code}</h1>
          <p className="mt-2 text-sm text-muted">
            ID pesanan {order.id} · dipesan {formatDateTime(order.createdAt)}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-sm ${orderStatusClass(order.status)}`}>
          {orderStatusLabels[order.status]}
        </span>
      </div>
      <p className="mt-6 max-w-xl text-[17px]">
        {statusHints[order.status]}
        {order.status === "dibatalkan" && order.events[0]?.note && ` ${order.events[0].note}.`}
      </p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        <div className="grid content-start gap-10">
          <section aria-labelledby="produk">
            <h2 id="produk" className="text-[24px] tracking-[-.03em]">Produk</h2>
            <ul className="mt-3 grid gap-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 rounded-md bg-surface px-4 py-3.5">
                  <div className="min-w-0">
                    <p>{item.productName}</p>
                    <p className="text-sm text-muted">
                      {item.quantity} × {item.price === null ? "harga menunggu konfirmasi" : formatRupiah(item.price)}
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
                {order.subtotal === null ? <span className="text-muted">Menunggu konfirmasi</span> : formatRupiah(order.subtotal)}
              </span>
            </p>
            {order.shippingCost === null ? (
              <p className="mt-1 text-sm text-muted">Ongkos kirim dihitung saat checkout.</p>
            ) : (
              <>
                <p className="mt-1 flex justify-between gap-4 text-muted">
                  <span>Ongkos kirim{order.courierName && ` · ${order.courierName}`}</span>
                  <span className="tabular-nums">{formatRupiah(order.shippingCost)}</span>
                </p>
                {total !== null && (
                  <p className="mt-4 flex justify-between gap-4 px-4 text-lg font-medium">
                    Total <span className="tabular-nums">{formatRupiah(total)}</span>
                  </p>
                )}
              </>
            )}
          </section>
          <section aria-labelledby="pengiriman">
            <h2 id="pengiriman" className="text-[24px] tracking-[-.03em]">Dikirim ke</h2>
            {order.shippingAddress ? (
              <>
                <p className="mt-3">
                  {order.recipientName} <span className="text-muted">· {order.phone}</span>
                </p>
                <p className="mt-1 max-w-xl text-[15px] leading-relaxed text-muted">
                  {order.shippingAddress} {order.postalCode}
                </p>
                {order.courierName && (
                  <p className="mt-2 text-sm text-muted">
                    Kurir: {order.courierName}
                    {order.shippingCost !== null && ` (${formatRupiah(order.shippingCost)})`}
                  </p>
                )}
                {order.status === "dibayar" && !order.shipmentId && (
                  <ChangeOrderAddress
                    orderId={order.id}
                    orderCode={order.code}
                    currentShippingCost={order.shippingCost ?? 0}
                  />
                )}
                {order.shipmentId && (
                  <p className="mt-3 text-sm text-muted">
                    Paket sudah diproses kurir. Untuk perubahan alamat, hubungi Sak Karepe lewat{" "}
                    <a
                      href={whatsappUrl(`Halo Sak Karepe, saya ingin mengubah alamat untuk pesanan ${order.code} (ID pesanan ${order.id}).`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent underline"
                    >
                      WhatsApp
                    </a>.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-3 text-[15px] text-muted">Alamat diisi saat checkout.</p>
            )}
            {order.notes && <p className="mt-4 max-w-xl whitespace-pre-line text-[15px]">Catatan: {order.notes}</p>}
          </section>
        </div>
        <aside className="grid content-start gap-6">
          {checkout && (
            <section aria-labelledby="checkout" className="rounded-md border border-line p-5">
              <h2 id="checkout" className="text-sm font-medium">Checkout</h2>
              <p className="mt-2 text-[15px] text-muted">
                {latestPayment ? "Link pembayaran sebelumnya sudah tidak berlaku. Checkout lagi untuk membuat link baru." : "Isi alamat pengiriman, lalu bayar."}
              </p>
              <Link href={`/pesanan/${order.code}/checkout`} className="btn mt-4 w-full">
                Lanjutkan checkout
              </Link>
            </section>
          )}
          {order.payments.length > 0 && !checkout && (
            <section aria-labelledby="pembayaran" className="rounded-md border border-line p-5">
              <h2 id="pembayaran" className="text-sm font-medium">Pembayaran</h2>
              {totalPaid > 0 ? (
                <>
                  <p className="mt-2 text-[22px] tabular-nums">{formatRupiah(totalPaid)}</p>
                  <p className="text-sm text-accent">
                    Lunas {paidPayments.length > 1 ? `(${paidPayments.length} kali bayar)` : formatDateTime(paidPayments[0].paidAt)}
                    {paidPayments.length === 1 && paidPayments[0].channel && ` · ${paidPayments[0].channel.replaceAll("_", " ")}`}
                  </p>
                  {paidPayments.length > 1 && (
                    <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
                      {paidPayments.map((p, idx) => (
                        <li key={p.id} className="flex justify-between text-muted">
                          <span>{idx === 0 ? "Pembayaran awal" : "Selisih ongkir"}</span>
                          <span className="tabular-nums font-medium text-ink">{formatRupiah(p.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {activePayment && (
                    <div className="mt-4 border-t border-line pt-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-danger">Tagihan selisih ongkir</span>
                        <span className="tabular-nums font-medium text-danger">{formatRupiah(activePayment.amount)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted">Bayar sebelum {formatDateTime(activePayment.expiresAt)} WIB</p>
                      <a href={activePayment.url} target="_blank" rel="noopener noreferrer" className="btn mt-3 w-full gap-2">
                        Bayar selisih <ArrowSquareOutIcon size={18} aria-hidden="true" />
                      </a>
                    </div>
                  )}
                </>
              ) : activePayment ? (
                <>
                  <p className="mt-2 text-[22px] tabular-nums">{formatRupiah(activePayment.amount)}</p>
                  <p className="text-sm text-muted">Bayar sebelum {formatDateTime(activePayment.expiresAt)} WIB</p>
                  <a href={activePayment.url} target="_blank" rel="noopener noreferrer" className="btn mt-4 w-full gap-2">
                    Bayar sekarang <ArrowSquareOutIcon size={18} aria-hidden="true" />
                  </a>
                </>
              ) : latestPayment?.cancelledAt ? (
                <p className="mt-2 text-sm text-muted">Link pembayaran dibatalkan {formatDateTime(latestPayment.cancelledAt)}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">Link pembayaran kedaluwarsa.</p>
              )}
            </section>
          )}
          {order.shipmentId && (
            <section aria-labelledby="status-pengiriman" className="rounded-md border border-line p-5">
              <h2 id="status-pengiriman" className="text-sm font-medium">Pengiriman</h2>
              <p className="mt-2 text-[17px]">{shipmentLabel}</p>
              <p className="mt-3 text-sm text-muted">{order.courierName}</p>
              <p className="text-sm text-muted">No. resi</p>
              <p className="text-[15px] tabular-nums">{order.waybillId ?? "Menyusul"}</p>
              {handedOver && order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[15px] text-accent hover:underline"
                >
                  Lacak pengiriman <ArrowSquareOutIcon size={16} aria-hidden="true" />
                </a>
              )}
              {order.status === "sampai" && (
                <div className="mt-4">
                  <ConfirmReceived action={confirmReceived.bind(null, order.id)} />
                </div>
              )}
            </section>
          )}
          <a
            href={whatsappUrl(`Halo Sak Karepe, saya ingin bertanya tentang pesanan ${order.code} (ID pesanan ${order.id}).`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-[15px] transition-colors hover:border-accent hover:text-accent"
          >
            <WhatsappLogoIcon size={18} aria-hidden="true" /> Tanya lewat WhatsApp
          </a>
          {waiting && <CancelOrder action={cancelOrder.bind(null, order.id)} hasPaymentLink={Boolean(activePayment)} />}
        </aside>
      </div>
    </main>
  );
}
