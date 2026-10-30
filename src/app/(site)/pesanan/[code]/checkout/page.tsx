import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { currentUserId } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { LoginPrompt } from "@/components/login-prompt";
import { OrderCheckout } from "@/components/order-checkout";
import { Breadcrumb } from "@/components/page-intro";
import { formatRupiah } from "@/lib/format";
import { isActivePayment } from "@/lib/payments";
export const metadata: Metadata = { title: "Checkout · Sak Karepe", robots: { index: false } };

/** Link yang dikirim admin lewat WhatsApp setelah harga disepakati. Pembeli mengisi alamat lalu diarahkan ke DOKU. */
export default async function CheckoutPage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code).toUpperCase();
  const userId = await currentUserId();
  if (!userId)
    return (
      <main id="utama" className="wrap pt-8 pb-20 md:pt-10">
        <Breadcrumb items={[{ label: "Pesanan saya", href: "/pesanan" }, { label: code, href: `/pesanan/${code}` }, { label: "Checkout" }]} />
        <h1 className="mt-8 text-[40px] tracking-[-.045em] md:text-[56px]">Checkout</h1>
        <p className="mt-4 max-w-md text-muted">Masuk dengan akun Google yang dipakai saat memesan untuk melanjutkan pesanan {code}.</p>
        <div className="mt-6">
          <LoginPrompt notice="Masuk untuk melanjutkan checkout." redirectTo={`/pesanan/${code}/checkout`} />
        </div>
      </main>
    );
  // Pesanan milik akun lain diperlakukan seperti tidak ada.
  const order = await db.query.orders.findFirst({
    where: and(eq(orders.code, code), eq(orders.userId, userId)),
    with: { items: true, payments: true },
  });
  if (!order) notFound();
  // Belum diberi harga, sudah dibayar/dibatalkan, atau link DOKU masih berlaku: tampilkan halaman pesanan.
  const open =
    (order.status === "menunggu_checkout" || order.status === "menunggu_pembayaran") &&
    !order.payments.some((payment) => payment.paidAt || isActivePayment(payment)) &&
    order.items.every((item) => item.price !== null);
  if (!open) redirect(`/pesanan/${order.code}`);
  const subtotal = order.items.reduce((sum, item) => sum + item.price! * item.quantity, 0);
  return (
    <main id="utama" className="wrap pt-8 pb-20 md:pt-10">
      <Breadcrumb
        items={[{ label: "Pesanan saya", href: "/pesanan" }, { label: order.code, href: `/pesanan/${order.code}` }, { label: "Checkout" }]}
      />
      <h1 className="mt-8 text-[40px] tracking-[-.045em] md:text-[56px]">Checkout</h1>
      <p className="mt-3 max-w-xl text-muted">
        Harga pesanan <span className="text-ink tabular-nums">{order.code}</span> sudah disepakati. Pilih alamat pengiriman untuk
        menghitung ongkos kirim, lalu lanjutkan ke pembayaran.
      </p>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
        <div className="lg:order-last">
          <section aria-labelledby="produk">
            <h2 id="produk" className="text-[24px] tracking-[-.03em]">Produk</h2>
            <ul className="mt-3 grid gap-2">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-4 rounded-md bg-surface px-4 py-3.5">
                  <div className="min-w-0">
                    <p>{item.productName}</p>
                    <p className="text-sm text-muted">
                      {item.quantity} × {formatRupiah(item.price!)}
                    </p>
                  </div>
                  <p className="shrink-0 tabular-nums">{formatRupiah(item.price! * item.quantity)}</p>
                </li>
              ))}
            </ul>
            {order.notes && <p className="mt-4 whitespace-pre-line text-[15px] text-muted">Catatan: {order.notes}</p>}
          </section>
        </div>
        <div>
          <OrderCheckout orderId={order.id} subtotal={subtotal} />
        </div>
      </div>
    </main>
  );
}
