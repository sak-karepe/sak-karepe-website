/**
 * Aturan nomor HP Indonesia. Dipakai server (lib/checkout-actions) dan form alamat di browser, agar validasi di kedua
 * sisi selalu sama.
 */

/** "0812-3456 789" atau "+62 812..." menjadi 08123456789; null bila bukan nomor Indonesia yang wajar. */
export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "").replace(/^62/, "0");
  return /^0\d{8,13}$/.test(digits) ? digits : null;
}

export const phoneError = "Nomor HP tidak valid. Contoh: 081234567890.";