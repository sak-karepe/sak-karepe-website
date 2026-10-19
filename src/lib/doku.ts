import { createHash, createHmac, randomUUID } from "node:crypto";

/**
 * DOKU Checkout (non-SNAP): https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration
 * DOKU_API_KEY adalah Client ID dari DOKU Back Office; DOKU_ENV=production memakai api.doku.com, selain itu sandbox.
 */
const host = process.env.DOKU_ENV === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com";
const target = "/checkout/v1/payment";

export type CheckoutRequest = {
  invoiceNumber: string;
  amount: number;
  lineItems: { id: string; name: string; price: number; quantity: number }[];
  /** Menit sebelum link kedaluwarsa. */
  dueMinutes: number;
  customer: { id: string; name: string; email: string; phone: string; address: string; postcode: string };
};

export type CheckoutResult = { ok: true; url: string; expiresAt: Date } | { ok: false; error: string };

/** Signature header: HMAC-SHA256 dari Client-Id, Request-Id, Request-Timestamp, Request-Target, dan Digest (SHA-256 body). */
function sign(clientId: string, secret: string, requestId: string, timestamp: string, body: string) {
  const digest = createHash("sha256").update(body, "utf8").digest("base64");
  const component = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${target}`,
    `Digest:${digest}`,
  ].join("\n");
  return `HMACSHA256=${createHmac("sha256", secret).update(component).digest("base64")}`;
}

/** expired_date DOKU berformat yyyyMMddHHmmss dalam WIB. */
function parseExpiry(value: string) {
  const [, y, mo, d, h, mi, s] = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/) ?? [];
  return y ? new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+07:00`) : null;
}

export async function createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
  const clientId = process.env.DOKU_API_KEY;
  const secret = process.env.DOKU_SECRET_KEY;
  if (!clientId || !secret) return { ok: false, error: "DOKU_API_KEY dan DOKU_SECRET_KEY belum diisi di .env." };
  const body = JSON.stringify({
    order: {
      amount: request.amount,
      invoice_number: request.invoiceNumber,
      currency: "IDR",
      line_items: request.lineItems,
    },
    payment: { payment_due_date: request.dueMinutes },
    customer: { ...request.customer, country: "ID" },
  });
  const requestId = randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  let response: Response;
  try {
    response = await fetch(host + target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Id": clientId,
        "Request-Id": requestId,
        "Request-Timestamp": timestamp,
        Signature: sign(clientId, secret, requestId, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, error: "Tidak bisa menghubungi DOKU. Coba lagi sebentar." };
  }
  const data = await response.json().catch(() => null);
  const payment = data?.response?.payment;
  const expiresAt = typeof payment?.expired_date === "string" ? parseExpiry(payment.expired_date) : null;
  if (response.ok && typeof payment?.url === "string" && expiresAt) return { ok: true, url: payment.url, expiresAt };
  const messages: unknown = data?.error_messages ?? data?.message ?? data?.error?.message;
  const detail = Array.isArray(messages) ? messages.join(", ") : typeof messages === "string" ? messages : `HTTP ${response.status}`;
  return { ok: false, error: `DOKU menolak permintaan: ${detail}` };
}
