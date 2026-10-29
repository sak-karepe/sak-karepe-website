import { and, eq, gt, inArray, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments, type Payment } from "@/db/schema";
import { cancelCheckout, checkStatus, type PaymentStatus } from "@/lib/doku";
import { formatRupiah } from "@/lib/format";
import { checkoutStatuses } from "@/lib/order-status";

/** Link yang belum dibayar, belum dibatalkan, dan belum kedaluwarsa. */
export const isActivePayment = (payment: Payment, now = new Date()) =>
  !payment.paidAt && !payment.cancelledAt && payment.expiresAt > now;

/**
 * Membatalkan link DOKU yang masih berlaku lewat Cancel Order API. Mengembalikan pesan galat bila ada link yang
 * tidak bisa dibatalkan; link yang sudah berhasil dibatalkan tetap ditandai.
 */
export async function cancelActivePayments(list: Payment[], note: string): Promise<string | undefined> {
  for (const payment of list.filter((payment) => isActivePayment(payment))) {
    // Link yang dibuat sebelum Request-Id disimpan tidak bisa dibatalkan lewat API.
    if (!payment.requestId) return "Link pembayaran pesanan ini tidak bisa dibatalkan otomatis.";
    const result = await cancelCheckout(payment.invoiceNumber, payment.requestId, note);
    if (!result.ok) return result.error;
    await db.update(payments).set({ cancelledAt: new Date() }).where(eq(payments.id, payment.id));
  }
}

/** Menandai pesanan "Perlu dicek" di dashboard admin. */
async function flagOrders(where: SQL, reason: string) {
  console.warn(`[doku] ${reason}`);
  await db.update(orders).set({ reviewNote: reason }).where(where);
}

/**
 * Mencatat pembayaran dari HTTP Notification atau Check Status DOKU. Hanya SUCCESS yang diproses: di Checkout, FAILED
 * berarti pembeli masih bisa mencoba metode lain. Aman dipanggil berulang karena pembayaran yang sudah lunas dilewati.
 * Invoice tak dikenal, nominal tidak cocok, atau lunas untuk pesanan yang tidak lagi menunggu pembayaran ditandai
 * "Perlu dicek" agar ditangani admin.
 */
export async function applyPayment(data: PaymentStatus) {
  const invoiceNumber = data.order?.invoice_number;
  if (data.transaction?.status !== "SUCCESS" || !invoiceNumber) return;
  const payment = await db.query.payments.findFirst({ where: eq(payments.invoiceNumber, invoiceNumber) });
  // Invoice berformat kode pesanan tanpa tanda hubung + "P" + nomor urut (lib/checkout-actions).
  if (!payment)
    return flagOrders(
      eq(sql`replace(${orders.code}, '-', '')`, invoiceNumber.replace(/P\d+$/, "")),
      `Pembayaran DOKU ${invoiceNumber} masuk, tapi invoice tidak dikenal.`,
    );
  if (payment.paidAt) return;
  const amount = Number(data.order?.amount);
  if (amount !== payment.amount)
    return flagOrders(
      eq(orders.id, payment.orderId),
      `Pembayaran DOKU ${invoiceNumber} sebesar ${Number.isFinite(amount) ? formatRupiah(amount) : data.order?.amount} tidak cocok dengan tagihan ${formatRupiah(payment.amount)}.`,
    );

  const paidAt = data.transaction.date ? new Date(data.transaction.date) : new Date();
  const paidOrder = await db.transaction(async (tx) => {
    const [recorded] = await tx
      .update(payments)
      .set({ paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt, channel: data.channel?.id ?? null })
      .where(and(eq(payments.id, payment.id), isNull(payments.paidAt)))
      .returning({ id: payments.id });
    // Sudah dicatat notifikasi, job, atau cek ulang yang berjalan bersamaan.
    if (!recorded) return true;
    // Status yang sudah diubah admin (dikirim, selesai, dibatalkan) tidak ditimpa.
    const [updated] = await tx
      .update(orders)
      .set({ status: "dibayar", updatedAt: new Date() })
      .where(and(eq(orders.id, payment.orderId), inArray(orders.status, checkoutStatuses)))
      .returning({ id: orders.id });
    return updated;
  });
  // Uang masuk tapi pesanan sudah tidak menunggu pembayaran (mis. dibatalkan).
  if (!paidOrder)
    await flagOrders(eq(orders.id, payment.orderId), `Invoice ${invoiceNumber} lunas, tapi pesanan tidak sedang menunggu pembayaran.`);
}

/** Link yang baru kedaluwarsa selama ini masih dicek, karena pembayaran di menit terakhir bisa tercatat belakangan. */
const recentlyExpiredMs = 24 * 60 * 60 * 1000;

/**
 * Mengecek ke DOKU link yang belum lunas untuk pesanan "menunggu_pembayaran", bila HTTP Notification tidak sampai.
 * Mengembalikan jumlah link yang gagal dicek.
 */
export async function reconcilePayments(now = new Date()) {
  const pending = await db
    .select({ invoiceNumber: payments.invoiceNumber })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(
      and(
        eq(orders.status, "menunggu_pembayaran"),
        isNull(payments.paidAt),
        isNull(payments.cancelledAt),
        gt(payments.expiresAt, new Date(now.getTime() - recentlyExpiredMs)),
      ),
    );
  let failed = 0;
  for (const { invoiceNumber } of pending) {
    const result = await checkStatus(invoiceNumber);
    if (result.ok) await applyPayment(result.status);
    else failed++;
  }
  return failed;
}
