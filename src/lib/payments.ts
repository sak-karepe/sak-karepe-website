import { and, eq, gt, inArray, isNotNull, isNull, lte, notExists, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orderEvents, orders, payments, type Payment } from "@/db/schema";
import { cancelCheckout, checkStatus, type PaymentStatus } from "@/lib/doku";
import { formatRupiah } from "@/lib/format";
import { checkoutStatuses } from "@/lib/order-status";
import { takeStock } from "@/lib/stock";

type DokuLink = Payment & { invoiceNumber: string; url: string; expiresAt: Date };

/** Link DOKU yang belum dibayar, belum dibatalkan, dan belum kedaluwarsa. Pembayaran manual selalu sudah lunas. */
export const isActivePayment = (payment: Payment, now = new Date()): payment is DokuLink =>
  !payment.paidAt && !payment.cancelledAt && !!payment.invoiceNumber && !!payment.url && !!payment.expiresAt && payment.expiresAt > now;

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
  // Invoice berformat kode pesanan tanpa tanda hubung + "P"/"S" + nomor urut (lib/checkout-actions).
  if (!payment)
    return flagOrders(
      eq(sql`replace(${orders.code}, '-', '')`, invoiceNumber.replace(/[PS]\d+$/, "")),
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
  const result = await db.transaction(async (tx) => {
    const [recorded] = await tx
      .update(payments)
      .set({ paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt, channel: data.channel?.id ?? null })
      .where(and(eq(payments.id, payment.id), isNull(payments.paidAt)))
      .returning({ id: payments.id });
    // Sudah dicatat notifikasi, job, atau cek ulang yang berjalan bersamaan.
    if (!recorded) return { paid: true, short: [] };
    const order = await tx.query.orders.findFirst({ columns: { status: true }, where: eq(orders.id, payment.orderId) });
    if (!order) return { paid: false, short: [] };

    // Pembayaran tambahan (mis. selisih ongkir saat ubah alamat) untuk pesanan yang sudah dibayar.
    if (order.status === "dibayar") {
      await tx
        .insert(orderEvents)
        .values({
          orderId: payment.orderId,
          fromStatus: "dibayar",
          toStatus: "dibayar",
          source: "doku",
          note: `Pembayaran tambahan ${invoiceNumber} sebesar ${formatRupiah(payment.amount)} lunas.`,
        });
      return { paid: true, short: [] };
    }

    // Status yang sudah diubah admin (dikirim, selesai, dibatalkan) tidak ditimpa.
    const [updated] = await tx
      .update(orders)
      .set({ status: "dibayar", updatedAt: new Date() })
      .where(and(eq(orders.id, payment.orderId), inArray(orders.status, checkoutStatuses)))
      .returning({ id: orders.id });
    if (updated)
      await tx
        .insert(orderEvents)
        .values({ orderId: payment.orderId, fromStatus: order.status, toStatus: "dibayar", source: "doku", note: `Invoice ${invoiceNumber}` });
    // Stok diambil hanya saat status benar-benar berpindah ke "dibayar", jadi notifikasi ulang tidak mengurangi lagi.
    return { paid: !!updated, short: updated ? await takeStock(tx, payment.orderId) : [] };
  });
  // Uang masuk tapi pesanan sudah tidak menunggu pembayaran (mis. dibatalkan).
  if (!result.paid)
    await flagOrders(eq(orders.id, payment.orderId), `Invoice ${invoiceNumber} lunas, tapi pesanan tidak sedang menunggu pembayaran.`);
  else if (result.short.length)
    await flagOrders(eq(orders.id, payment.orderId), `Pesanan sudah dibayar, tapi stok ${result.short.join(", ")} tidak cukup.`);
}

/** Link yang baru kedaluwarsa selama ini masih dicek, karena pembayaran di menit terakhir bisa tercatat belakangan. */
const recentlyExpiredMs = 24 * 60 * 60 * 1000;

/**
 * Mengecek ke DOKU link yang belum lunas untuk pesanan "menunggu_pembayaran", bila HTTP Notification tidak sampai.
 * Mengembalikan jumlah link yang gagal dicek.
 */
export async function reconcilePayments(now = new Date()) {
  const pending = await db
    .select({ invoiceNumber: sql<string>`${payments.invoiceNumber}` })
    .from(payments)
    .innerJoin(orders, eq(orders.id, payments.orderId))
    .where(
      and(
        eq(orders.status, "menunggu_pembayaran"),
        isNotNull(payments.invoiceNumber),
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

/** Pesanan "menunggu_pembayaran" dibatalkan bila semua link DOKU-nya sudah kedaluwarsa selama ini. */
export const unpaidExpiryMs = 3 * 24 * 60 * 60 * 1000;
/** Pesanan "menunggu_konfirmasi"/"menunggu_checkout" dibatalkan bila tidak berubah selama ini. */
export const idleOrderMs = 7 * 24 * 60 * 60 * 1000;
export const expiredNote = "Dibatalkan otomatis: kedaluwarsa";

/**
 * Membatalkan pesanan belum dibayar yang kedaluwarsa (lihat `unpaidExpiryMs` dan `idleOrderMs`). Pesanan yang punya
 * pembayaran lunas, link yang belum lama kedaluwarsa, atau tanda "Perlu dicek" dilewati, jadi pembayaran di menit terakhir yang baru tercatat
 * lewat notifikasi atau `reconcilePayments` tidak ikut terbatalkan. Aman dijalankan berulang.
 */
export const cancelExpiredOrders = (now = new Date()) =>
  db.transaction(
    async (tx) => {
      const expired = and(
        // Pesanan "Perlu dicek" (mis. uang masuk dengan nominal salah) menunggu admin, tidak dibatalkan.
        isNull(orders.reviewNote),
        or(
          and(eq(orders.status, "menunggu_pembayaran"), lte(orders.updatedAt, new Date(now.getTime() - unpaidExpiryMs))),
          and(inArray(orders.status, ["menunggu_konfirmasi", "menunggu_checkout"]), lte(orders.updatedAt, new Date(now.getTime() - idleOrderMs))),
        ),
        notExists(
          tx
            .select({ id: payments.id })
            .from(payments)
            .where(
              and(
                eq(payments.orderId, orders.id),
                or(isNotNull(payments.paidAt), gt(payments.expiresAt, new Date(now.getTime() - unpaidExpiryMs))),
              ),
            ),
        ),
      )!;
      // Status lama dibaca untuk riwayat; kunci tulis "immediate" membuat baca dan ubah tidak disela notifikasi DOKU.
      const list = await tx.select({ id: orders.id, status: orders.status }).from(orders).where(expired);
      if (!list.length) return list;
      await tx
        .update(orders)
        .set({ status: "dibatalkan", updatedAt: now })
        .where(and(inArray(orders.id, list.map(({ id }) => id)), expired));
      await tx.insert(orderEvents).values(
        list.map(({ id, status }): typeof orderEvents.$inferInsert => ({ orderId: id, fromStatus: status, toStatus: "dibatalkan", source: "sistem", note: expiredNote })),
      );
      return list;
    },
    { behavior: "immediate" },
  );
