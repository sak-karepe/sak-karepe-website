import { eq } from "drizzle-orm";
import { db } from "@/db";
import { payments, type Payment } from "@/db/schema";
import { cancelCheckout } from "@/lib/doku";

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
