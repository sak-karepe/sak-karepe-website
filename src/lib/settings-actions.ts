"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdminPage } from "@/auth";
import { isValidIndonesianPhone } from "@/lib/contact";
import { revalidatePath } from "next/cache";

export type SettingsState = {
  error?: string;
  success?: string;
} | null;

export async function updateSettings(_prevState: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdminPage();

  const whatsappNumber = formData.get("whatsappNumber")?.toString().trim() || "";
  const address = formData.get("address")?.toString().trim() || "";
  const googleMapsLink = formData.get("googleMapsLink")?.toString().trim() || "";
  const instagramUrl = formData.get("instagramUrl")?.toString().trim() || "";
  const openingHours = formData.get("openingHours")?.toString().trim() || "";

  // Validasi nomor WhatsApp
  if (whatsappNumber && !isValidIndonesianPhone(whatsappNumber)) {
    return {
      error: "Nomor WhatsApp tidak valid. Format harus diawali dengan '62' (contoh: 6281234567890) tanpa spasi atau karakter +.",
    };
  }

  const payload = [
    { key: "whatsappNumber", value: whatsappNumber },
    { key: "address", value: address },
    { key: "googleMapsLink", value: googleMapsLink },
    { key: "instagramUrl", value: instagramUrl },
    { key: "openingHours", value: openingHours },
  ];

  try {
    for (const item of payload) {
      await db
        .insert(settings)
        .values(item)
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: item.value },
        });
    }

    revalidatePath("/", "layout");
    return { success: "Pengaturan kontak dan toko berhasil diperbarui!" };
  } catch (error) {
    console.log(error)
    return { error: "Terjadi kesalahan saat menyimpan ke database." };
  }
}