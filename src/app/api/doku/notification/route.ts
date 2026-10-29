import { revalidatePath } from "next/cache";
import { verifyNotification, type PaymentStatus } from "@/lib/doku";
import { applyPayment } from "@/lib/payments";

/** Path Notification URL yang didaftarkan di DOKU Back Office; ikut dihitung dalam signature. */
const requestTarget = "/api/doku/notification";

/**
 * HTTP Notification DOKU untuk semua metode pembayaran Checkout; dicatat lewat `applyPayment` yang juga dipakai job
 * rekonsiliasi. Notifikasi yang sama bisa datang lebih dari sekali.
 */
export async function POST(request: Request) {
  const body = await request.text();
  if (!verifyNotification(request.headers, body, requestTarget)) {
    console.warn("[doku] Signature notifikasi tidak valid");
    return new Response("Invalid signature", { status: 401 });
  }
  let data: PaymentStatus;
  try {
    data = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  await applyPayment(data);
  revalidatePath("/admin", "layout");
  return new Response("OK");
}
