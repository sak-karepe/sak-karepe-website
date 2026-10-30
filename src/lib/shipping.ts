import { contact } from "@/lib/contact";

/**
 * Cek ongkir Biteship (Rates API): https://biteship.com/id/docs/api/rates/retrieve
 * BITESHIP_API_KEY berawalan biteship_test. (mode testing) atau biteship_live. (produksi); keduanya memakai host yang sama.
 * Setiap permintaan rates berbayar, jadi hasil yang sama disimpan sebentar di memori.
 */
const ratesUrl = "https://api.biteship.com/v1/rates/couriers";
/** Kode pos asal pengiriman; default alamat Sak Karepe di SLB Khusus Bina Mandiri (lib/contact). */
const originPostalCode = Number(process.env.BITESHIP_ORIGIN_POSTAL_CODE || 60238);
/** Kode kurir Biteship dipisah koma; J&T paling depan karena kurir pilihan mitra. */
const couriers = process.env.BITESHIP_COURIERS || "jnt,jne,sicepat,anteraja,pos";
/** Berat untuk produk yang belum diisi beratnya. */
export const defaultWeight = 1000;
const cacheMs = 10 * 60 * 1000;

export type ShippingItem = { name: string; price: number; quantity: number; weight: number | null };
export type ShippingOption = {
  courierCode: string;
  serviceCode: string;
  /** Mis. "J&T EZ" atau "JNE Reguler". */
  name: string;
  /** Mis. "2 - 3 hari"; kosong bila Biteship tidak memberi estimasi. */
  duration: string;
  price: number;
};
export type ShippingQuote = { ok: true; options: ShippingOption[] } | { ok: false; error: string };

type Pricing = {
  courier_code: string;
  courier_name: string;
  courier_service_code: string;
  courier_service_name: string;
  shipment_duration_range?: string;
  shipment_duration_unit?: string;
  shipping_type?: string;
  price: number;
};
type RatesBody = { success?: boolean; error?: unknown; pricing?: Pricing[] } | null;

const cache = new Map<string, { expires: number; options: ShippingOption[] }>();
const units: Record<string, string> = { days: "hari", hours: "jam" };
const down = "Layanan cek ongkir sedang gangguan. Coba lagi sebentar.";
/**
 * Pesan saldo kurang menurut support Biteship (Okt 2026): Orders API "Bite points tidak cukup", Rates API "No sufficient
 * balance to call rates API. Please top up your balance" (HTTP 400). Tidak ada kode error khusus maupun API saldo.
 */
const lowBalancePattern = /bite ?points|balance|saldo/i;

/** Layanan paket (bukan kargo/trucking) dari kurir pilihan, termurah lebih dulu. */
export async function quoteShipping(destinationPostalCode: string, items: ShippingItem[]): Promise<ShippingQuote> {
  const apiKey = process.env.BITESHIP_API_KEY;
  if (!apiKey) return { ok: false, error: "Cek ongkir belum aktif (BITESHIP_API_KEY belum diisi)." };
  const body = JSON.stringify({
    origin_postal_code: originPostalCode,
    destination_postal_code: Number(destinationPostalCode),
    couriers,
    items: items.map((item) => ({
      name: item.name.slice(0, 255),
      category: "fashion",
      value: item.price,
      quantity: item.quantity,
      weight: item.weight || defaultWeight,
    })),
  });
  const cached = cache.get(body);
  if (cached && cached.expires > Date.now()) return { ok: true, options: cached.options };

  let response: Response;
  try {
    response = await fetch(ratesUrl, {
      method: "POST",
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, error: down };
  }
  const data: RatesBody = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    console.warn(`[biteship] Rates ke ${destinationPostalCode} gagal (HTTP ${response.status}): ${String(data?.error ?? "")}`);
    // Saldo habis juga dianggap gangguan: pembeli tidak perlu tahu soal saldo, dan kode posnya tidak salah.
    return {
      ok: false,
      error:
        response.status >= 500 || lowBalancePattern.test(String(data?.error ?? ""))
          ? down
          : "Ongkos kirim ke alamat ini belum bisa dihitung. Periksa kode pos atau pilih alamat lain.",
    };
  }
  const options = (data.pricing ?? [])
    .filter((pricing) => !pricing.shipping_type || pricing.shipping_type === "parcel")
    .map((pricing) => ({
      courierCode: pricing.courier_code,
      serviceCode: pricing.courier_service_code,
      name: pricing.courier_service_name.startsWith(pricing.courier_name)
        ? pricing.courier_service_name
        : `${pricing.courier_name} ${pricing.courier_service_name}`,
      // "1 - 1" menjadi "1".
      duration: pricing.shipment_duration_range
        ? `${pricing.shipment_duration_range.replace(/^(\d+) - \1$/, "$1")} ${units[pricing.shipment_duration_unit ?? ""] ?? pricing.shipment_duration_unit ?? ""}`.trim()
        : "",
      price: pricing.price,
    }))
    .sort((a, b) => a.price - b.price);
  if (!options.length) return { ok: false, error: "Belum ada kurir yang melayani alamat ini." };
  // Entri kedaluwarsa dibuang agar Map tidak terus membesar selama server hidup.
  for (const [key, entry] of cache) if (entry.expires < Date.now()) cache.delete(key);
  cache.set(body, { expires: Date.now() + cacheMs, options });
  return { ok: true, options };
}

/**
 * Pemesanan kurir (Orders API): https://biteship.com/id/docs/api/orders/create
 * Menghasilkan ID order Biteship dan nomor resi. "pickup" meminta kurir menjemput, "drop_off" berarti admin mengantar
 * paket ke agen kurir.
 */
const ordersUrl = "https://api.biteship.com/v1/orders";

export type CollectionMethod = "pickup" | "drop_off";
/** `note`: catatan riwayat kurir terbaru, mis. alasan paket dikembalikan. */
export type Shipment = { id: string; status: string; waybillId: string | null; trackingUrl: string | null; note: string | null };
export type ShipmentResult = ({ ok: true } & Shipment) | { ok: false; error: string };
type OrderBody = { success?: boolean; error?: unknown; code?: number; id?: string; status?: string; courier?: { waybill_id?: string | null; link?: string | null; history?: { note?: string | null }[] } } | null;

/** Galat jaringan, HTTP 5xx, atau balasan tak terbaca (bukan penolakan Biteship); webhook membalas non-200 agar dikirim ulang. */
export const unreachable = "Layanan kurir Biteship sedang gangguan. Coba lagi sebentar.";
export const lowBalance = "Saldo Biteship tidak cukup. Top up di dashboard Biteship lalu coba lagi.";
/** Biteship membalas "You have reached your monthly Orders API limit"; order di mode testing tidak mengurangi kuota. */
export const quotaReached = "Kuota pengiriman Biteship bulan ini habis. Naikkan paket di dashboard Biteship atau tunggu bulan depan.";

async function biteship(url: string, init: RequestInit = {}): Promise<ShipmentResult> {
  const apiKey = process.env.BITESHIP_API_KEY;
  if (!apiKey) return { ok: false, error: "Biteship belum aktif (BITESHIP_API_KEY belum diisi)." };
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { Authorization: apiKey, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return { ok: false, error: unreachable };
  }
  const data: OrderBody = await response.json().catch(() => null);
  if (!response.ok || !data?.success || !data.id) {
    console.warn(`[biteship] ${init.method ?? "GET"} ${url} gagal (HTTP ${response.status}, kode ${data?.code ?? "-"}): ${String(data?.error ?? "")}`);
    // Balasan yang tidak terbaca (terputus/timeout) bisa berarti order sudah terbuat, jadi diperlakukan seperti gangguan.
    if (response.status >= 500 || !data) return { ok: false, error: unreachable };
    const message = String(data.error ?? "Biteship menolak permintaan.");
    return { ok: false, error: lowBalancePattern.test(message) ? lowBalance : /monthly .*limit/i.test(message) ? quotaReached : message };
  }
  return {
    ok: true,
    id: data.id,
    status: data.status ?? "",
    waybillId: data.courier?.waybill_id || null,
    trackingUrl: data.courier?.link || null,
    note: data.courier?.history?.at(-1)?.note || null,
  };
}

export function createShipment(input: {
  /** Unik per percobaan: Biteship menolak reference_id yang pernah dipakai, termasuk dari order yang dibatalkan. */
  reference: string;
  method: CollectionMethod;
  courierCode: string;
  serviceCode: string;
  destination: { name: string; phone: string; address: string; postalCode: string; note?: string };
  items: ShippingItem[];
}) {
  return biteship(ordersUrl, {
    method: "POST",
    body: JSON.stringify({
      reference_id: input.reference,
      origin_contact_name: "Sak Karepe",
      origin_contact_phone: `0${contact.whatsapp.slice(2)}`,
      origin_address: contact.address,
      origin_postal_code: originPostalCode,
      origin_collection_method: input.method,
      destination_contact_name: input.destination.name,
      destination_contact_phone: input.destination.phone,
      destination_address: input.destination.address,
      destination_postal_code: Number(input.destination.postalCode),
      destination_note: input.destination.note,
      courier_company: input.courierCode,
      courier_type: input.serviceCode,
      delivery_type: "now",
      items: input.items.map((item) => ({
        name: item.name.slice(0, 255),
        category: "fashion",
        value: item.price,
        quantity: item.quantity,
        weight: item.weight || defaultWeight,
      })),
    }),
  });
}

/** Status terbaru langsung dari Biteship; isi webhook tidak dipakai untuk status. */
export const getShipment = (id: string) => biteship(`${ordersUrl}/${encodeURIComponent(id)}`);
