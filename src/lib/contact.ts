import { db } from "@/db";
import { settings } from "@/db/schema";
import { inArray } from "drizzle-orm";

/* Nomor WhatsApp default dari environment atau fallback ke nomor yang dikonfirmasi.*/
const defaultWhatsapp = (
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285731580488"
)
  .replace(/\D/g, "")
  .replace(/^0/, "62");

const defaultPhone = `0${defaultWhatsapp.slice(2)}`.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");

/* Objek kontak statis (fallback) untuk kompatibilitas dengan komponen yang mengimpor `contact` secara langsung. */
export const contact = {
  phone: defaultPhone,
  whatsapp: defaultWhatsapp,
  location: "SLB Khusus Bina Mandiri",
  address:
    "Jl. Jemursari XVII No. E1, Jemur Wonosari, Kec. Wonocolo, Surabaya, Jawa Timur 60238",
  maps: "https://share.google/ebg7RfgE78FuInTF2",
  embed:
    "https://maps.google.com/maps?q=SLB%20KHUSUS%20BINA%20MANDIRI%20Jl.%20Jemursari%20XVII%20Surabaya&z=16&output=embed",
};

export const whatsappUrl = (
  message = "Halo Sak Karepe, saya ingin berkonsultasi tentang produk ecoprint.",
) => `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;

/**
 * Validasi format nomor WhatsApp (Harus diawali 62, hanya angka, panjang 10 s.d. 15 digit).
 */
export function isValidIndonesianPhone(phone: string): boolean {
  return /^62\d{8,13}$/.test(phone);
}

/**
 * Mengambil pengaturan kontak dari database dengan fallback ke nilai default / statis.
 */
export async function getContactSettings() {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(
        inArray(settings.key, [
          "whatsappNumber",
          "address",
          "googleMapsLink",
          "instagramUrl",
          "openingHours",
        ])
      );

    const map = new Map(rows.map((r) => [r.key, r.value]));

    const rawWhatsapp = map.get("whatsappNumber") || defaultWhatsapp;
    const whatsapp = rawWhatsapp.replace(/\D/g, "").replace(/^0/, "62");
    const phone = `0${whatsapp.slice(2)}`.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");

    return {
      phone,
      whatsapp,
      location: "SLB Khusus Bina Mandiri",
      address:
        map.get("address") || contact.address,
      maps: map.get("googleMapsLink") || contact.maps,
      embed: contact.embed,
      instagramUrl: map.get("instagramUrl") || "",
      openingHours: map.get("openingHours") || "Senin - Sabtu: 09:00 - 17:00 WIB",
    };
  } catch {
    return {
      ...contact,
      instagramUrl: "",
      openingHours: "Senin - Sabtu: 09:00 - 17:00 WIB",
    };
  }
}