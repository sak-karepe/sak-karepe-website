import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { applyShipment } from "@/lib/shipments";
import { getShipment, unreachable } from "@/lib/shipping";

/** Header rahasia yang diisi di form webhook Biteship (Headers Signature Key/Secret); kosong berarti tidak dicek. */
const headerName = process.env.BITESHIP_WEBHOOK_HEADER || "X-Sakkarepe-Signature";
const secret = process.env.BITESHIP_WEBHOOK_SECRET;

// Dibandingkan lewat hash agar panjang berbeda tidak melempar error dan waktunya tetap konstan.
const digest = (value: string) => createHash("sha256").update(value).digest();
const validSignature = (value: string | null) => !secret || (value !== null && timingSafeEqual(digest(value), digest(secret)));

/**
 * Webhook Biteship (event order.status dan order.waybill_id), didaftarkan di Dashboard Biteship > Integrasi > Webhook.
 * Selain header rahasia, status dan resi tetap diambil ulang dari Orders API; isi webhook hanya dipakai untuk ID order.
 * Permintaan uji kosong saat URL didaftarkan dibalas 200.
 */
export async function POST(request: Request) {
  if (!validSignature(request.headers.get(headerName))) {
    console.warn("[biteship] Signature webhook tidak valid");
    return new Response("Invalid signature", { status: 401 });
  }
  const data: { order_id?: unknown } | null = await request.json().catch(() => null);
  if (typeof data?.order_id !== "string") return new Response("OK");
  const shipment = await getShipment(data.order_id);
  // Hanya gangguan jaringan dibalas non-200 agar Biteship mengirim ulang; order yang ditolak Biteship atau API key kosong
  // tidak akan berhasil walau diulang. Job rekonsiliasi juga mengecek pesanan yang lama tidak berubah.
  if (!shipment.ok)
    return shipment.error === unreachable ? new Response("Gagal menghubungi Biteship", { status: 502 }) : new Response("OK");
  await applyShipment(shipment);
  revalidatePath("/admin", "layout");
  revalidatePath("/pesanan", "layout");
  return new Response("OK");
}
