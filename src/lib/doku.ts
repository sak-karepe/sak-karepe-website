import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

/**
 * DOKU Checkout (non-SNAP): https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration
 * DOKU_CLIENT_ID adalah Client ID (BRN-...) dari DOKU Back Office, bukan API Key (doku_key_...); DOKU_ENV=production memakai api.doku.com, selain itu sandbox.
 */
const host = process.env.DOKU_ENV === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com";
const checkoutTarget = "/checkout/v1/payment";
const cancelTarget = "/checkout/v3/cancellations";
const statusTarget = "/orders/v1/status";

export type CheckoutRequest = {
  invoiceNumber: string;
  amount: number;
  lineItems: { id: string; name: string; price: number; quantity: number }[];
  /** Menit sebelum link kedaluwarsa. */
  dueMinutes: number;
  customer: { id: string; name: string; email: string; phone: string; address: string; postcode: string };
};

export type CheckoutResult = { ok: true; url: string; expiresAt: Date; requestId: string } | { ok: false; error: string };

/**
 * Signature header: HMAC-SHA256 dari Client-Id, Request-Id, Request-Timestamp, Request-Target, dan Digest (SHA-256 body).
 * Permintaan GET tanpa body tidak memakai Digest.
 */
function sign(clientId: string, secret: string, requestId: string, timestamp: string, requestTarget: string, body?: string) {
  const component = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${requestTarget}`,
    ...(body === undefined ? [] : [`Digest:${createHash("sha256").update(body, "utf8").digest("base64")}`]),
  ].join("\n");
  return `HMACSHA256=${createHmac("sha256", secret).update(component).digest("base64")}`;
}

/** expired_date DOKU berformat yyyyMMddHHmmss dalam WIB. */
function parseExpiry(value: string) {
  const [, y, mo, d, h, mi, s] = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/) ?? [];
  return y ? new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+07:00`) : null;
}

/** Bagian HTTP Notification dan Check Status API yang dipakai; bentuk keduanya sama. */
export type PaymentStatus = {
  order?: { invoice_number?: string; amount?: number | string };
  transaction?: { status?: string; date?: string };
  channel?: { id?: string };
};

type DokuBody = (PaymentStatus & {
  response?: { payment?: { url?: unknown; expired_date?: unknown } };
  error_messages?: unknown;
  message?: unknown;
  error?: { message?: unknown };
}) | null;
type DokuResponse = { ok: true; status: number; success: boolean; data: DokuBody; requestId: string } | { ok: false; error: string };

/** Permintaan bertanda tangan ke API DOKU: POST bila ada payload, selain itu GET; `success` bila HTTP 2xx. */
async function send(target: string, payload?: unknown): Promise<DokuResponse> {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secret = process.env.DOKU_SECRET_KEY;
  if (!clientId || !secret) return { ok: false, error: "DOKU_CLIENT_ID dan DOKU_SECRET_KEY belum diisi di .env." };
  const body = payload === undefined ? undefined : JSON.stringify(payload);
  const requestId = randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  let response: Response;
  try {
    response = await fetch(host + target, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body !== undefined && { "Content-Type": "application/json" }),
        "Client-Id": clientId,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: sign(clientId, secret, requestId, timestamp, target, body),
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, error: "Layanan pembayaran DOKU sedang gangguan. Coba lagi sebentar." };
  }
  const data: DokuBody = await response.json().catch(() => null);
  return { ok: true, status: response.status, success: response.ok, data, requestId };
}

function rejection(status: number, data: DokuBody) {
  const messages: unknown = data?.error_messages ?? data?.message ?? data?.error?.message;
  const detail = Array.isArray(messages) ? messages.join(", ") : typeof messages === "string" ? messages : `HTTP ${status}`;
  return `DOKU menolak permintaan: ${detail}`;
}

export async function createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
  const result = await send(checkoutTarget, {
    order: {
      amount: request.amount,
      invoice_number: request.invoiceNumber,
      currency: "IDR",
      line_items: request.lineItems,
    },
    payment: { payment_due_date: request.dueMinutes },
    customer: { ...request.customer, country: "ID" },
  });
  if (!result.ok) return result;
  const payment = result.data?.response?.payment;
  const expiresAt = typeof payment?.expired_date === "string" ? parseExpiry(payment.expired_date) : null;
  if (result.success && typeof payment?.url === "string" && expiresAt)
    return { ok: true, url: payment.url, expiresAt, requestId: result.requestId };
  return { ok: false, error: rejection(result.status, result.data) };
}

/**
 * Membatalkan link Checkout yang belum dibayar: https://developers.doku.com/accept-payments/doku-checkout/additional-feature/cancel-order-api
 * Harus diaktifkan di Dashboard (Checkout Appearance → System Settings → Order Cancellation) dan hanya untuk VA/QRIS;
 * link yang sudah dibayar, kedaluwarsa, atau memakai metode lain ditolak DOKU.
 */
export async function cancelCheckout(invoiceNumber: string, originalRequestId: string, note: string) {
  const result = await send(cancelTarget, {
    order: { invoice_number: invoiceNumber },
    payment: { original_request_id: originalRequestId },
    note,
  });
  if (!result.ok) return result;
  return result.success ? { ok: true as const } : { ok: false as const, error: rejection(result.status, result.data) };
}

/**
 * Status pembayaran terbaru (Check Status API), untuk rekonsiliasi bila HTTP Notification tidak sampai:
 * https://developers.doku.com/accept-payments/doku-checkout/additional-feature/check-status-api
 */
export async function checkStatus(invoiceNumber: string) {
  const result = await send(`${statusTarget}/${encodeURIComponent(invoiceNumber)}`);
  if (!result.ok) return result;
  return result.success && result.data
    ? { ok: true as const, status: result.data }
    : { ok: false as const, error: rejection(result.status, result.data) };
}

/**
 * Memastikan HTTP Notification benar dari DOKU: signature dihitung ulang dengan Request-Target berupa path Notification URL.
 * https://developers.doku.com/get-started-with-doku-api/notification/best-practice
 */
export function verifyNotification(headers: Headers, body: string, requestTarget: string) {
  const clientId = process.env.DOKU_CLIENT_ID;
  const secret = process.env.DOKU_SECRET_KEY;
  const requestId = headers.get("Request-Id");
  const timestamp = headers.get("Request-Timestamp");
  const signature = headers.get("Signature");
  if (!clientId || !secret || headers.get("Client-Id") !== clientId || !requestId || !timestamp || !signature) return false;
  const expected = Buffer.from(sign(clientId, secret, requestId, timestamp, requestTarget, body));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
