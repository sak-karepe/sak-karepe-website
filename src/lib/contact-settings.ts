import { db } from "@/db";
import { settings } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { contact, defaultWhatsapp } from "@/lib/contact";

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