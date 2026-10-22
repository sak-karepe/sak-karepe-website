import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { verifyNotification } from "@/lib/doku";
import { checkoutStatuses } from "@/lib/order-status";

/** Path Notification URL yang didaftarkan di DOKU Back Office; ikut dihitung dalam signature. */
const requestTarget = "/api/doku/notification";

type Notification = {
  order?: { invoice_number?: string; amount?: number | string };
  transaction?: { status?: string; date?: string };
  channel?: { id?: string };
};

/**
 * HTTP Notification DOKU untuk semua metode pembayaran Checkout.
 * Hanya SUCCESS yang diproses: di Checkout, FAILED berarti pembeli masih bisa mencoba metode lain.
 * Notifikasi yang sama bisa datang lebih dari sekali, jadi pembayaran yang sudah lunas dilewati.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyNotification(request.headers, body, requestTarget)) {
    console.warn("[doku] Signature notifikasi tidak valid");
    return new Response("Invalid signature", { status: 401 });
  }
  let data: Notification;
  try {
    data = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const invoiceNumber = data.order?.invoice_number;
  if (data.transaction?.status !== "SUCCESS" || !invoiceNumber) return new Response("OK");

  const payment = await db.query.payments.findFirst({ where: eq(payments.invoiceNumber, invoiceNumber) });
  if (!payment) {
    console.warn(`[doku] Invoice ${invoiceNumber} tidak dikenal`);
    return new Response("OK");
  }
  if (payment.paidAt) return new Response("OK");
  if (Number(data.order?.amount) !== payment.amount) {
    console.warn(`[doku] Nominal ${invoiceNumber} tidak cocok: ${data.order?.amount} vs ${payment.amount}`);
    return new Response("OK");
  }

  const paidAt = data.transaction.date ? new Date(data.transaction.date) : new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(payments)
      .set({ paidAt: Number.isNaN(paidAt.getTime()) ? new Date() : paidAt, channel: data.channel?.id ?? null })
      .where(and(eq(payments.id, payment.id), isNull(payments.paidAt)));
    // Status yang sudah diubah admin (dikirim, selesai, dibatalkan) tidak ditimpa.
    await tx
      .update(orders)
      .set({ status: "dibayar", updatedAt: new Date() })
      .where(and(eq(orders.id, payment.orderId), inArray(orders.status, checkoutStatuses)));
  });
  revalidatePath("/admin", "layout");
  return new Response("OK");
}
