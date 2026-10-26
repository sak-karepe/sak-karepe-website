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
    return { ok: false, error: "Tidak bisa menghubungi layanan cek ongkir. Coba lagi sebentar." };
  }
  const data: RatesBody = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    console.warn(`[biteship] Rates gagal (HTTP ${response.status}): ${String(data?.error ?? "")}`);
    return { ok: false, error: "Ongkos kirim ke alamat ini belum bisa dihitung. Periksa kode pos atau pilih alamat lain." };
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
  cache.set(body, { expires: Date.now() + cacheMs, options });
  return { ok: true, options };
}
