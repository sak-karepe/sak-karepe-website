const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const formatRupiah = (value: number) => rupiah.format(value);
const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
export const formatDateTime = (value: Date) => dateTime.format(value);
/** "150.000", "Rp150000", atau "Rp150.000,00" menjadi 150000; kosong menjadi null. Sen (",00") dibuang. */
export function parseAmount(value: FormDataEntryValue | null) {
  const digits = String(value ?? "").trim().replace(/,\d{1,2}$/, "").replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

/** Ubah karakter selain huruf kecil, angka, dan tanda hubung menjadi `-` saat mengetik permalink. */
export function sanitizeSlugInput(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80)
    .replace(/^-+/, "");
}

/** "Tote Bag, Daun Jati!" menjadi "tote-bag-daun-jati". */
export function slugify(value: string) {
  return sanitizeSlugInput(value).replace(/-+$/g, "") || "produk";
}
