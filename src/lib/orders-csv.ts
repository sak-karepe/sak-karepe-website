import type { Order } from "@/db/schema";
import { orderStatusLabels } from "@/lib/order-status";

/**
 * Pemisah kolom. Excel dengan pengaturan regional Indonesia/Eropa memakai titik koma, sedangkan koma membuat seluruh baris
 * menumpuk di kolom A. Google Sheets mendeteksi pemisah sendiri. Ganti ke "," bila perlu dibuka di Excel berbahasa Inggris (AS).
 */
export const csvDelimiter = ";";

/** Pesanan beserta relasi yang dibutuhkan export. */
export type ExportOrder = Pick<
  Order,
  "code" | "source" | "createdAt" | "customerName" | "customerPhone" | "phone" | "subtotal" | "shippingCost" | "status" | "courierName" | "waybillId" | "externalRef"
> & {
  user: { name: string | null; email: string } | null;
  items: { productName: string; quantity: number }[];
  payments: { method: string; channel: string | null; paidAt: Date | null }[];
};

export const orderCsvHeader = [
  "Kode",
  "Tanggal transaksi",
  "Sumber",
  "Pembeli",
  "No. HP",
  "Email",
  "Produk",
  "Subtotal",
  "Ongkir",
  "Total",
  "Status",
  "Metode bayar",
  "No. nota",
  "Kurir",
  "Resi",
  "Tanggal bayar",
];

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "2026-11-08 12:18" menurut WIB; format yang dibaca Excel dan Google Sheets sebagai tanggal-waktu. */
export function csvDate(date: Date | null | undefined) {
  if (!date) return "";
  const part = Object.fromEntries(dateFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}`;
}

/**
 * Satu sel CSV. Angka ditulis apa adanya. Teks diberi tanda kutip bila mengandung pemisah kolom, koma, kutip, atau baris baru, dan
 * diawali ' bila bisa dibaca Excel/Sheets sebagai rumus (diawali = @ atau + - yang bukan angka/nomor telepon).
 */
export function csvCell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  const formula = /^[=@\t\r]/.test(value) || (/^[+-]/.test(value) && !/^[+-][\d\s().-]*$/.test(value));
  const text = formula ? `'${value}` : value;
  return /[",\r\n]/.test(text) || text.includes(csvDelimiter) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Satu baris export, urut sesuai `orderCsvHeader`. */
export function orderCsvRow(order: ExportOrder) {
  // Pembayaran lunas paling awal; pembeli yang membuat ulang link DOKU bisa punya beberapa baris, hanya satu yang lunas.
  const paid = order.payments.filter((payment) => payment.paidAt).sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime())[0];
  // Aturan tanggal sama dengan laporan: tanggal bayar untuk online, tanggal dibuat untuk langsung/historis.
  const date = order.source === "online" ? paid?.paidAt : order.createdAt;
  return [
    order.code,
    csvDate(date),
    order.source,
    // Pembeli tanpa akun (transaksi langsung/historis) memakai nama yang dicatat admin.
    order.user ? (order.user.name ?? order.user.email) : (order.customerName ?? ""),
    order.phone ?? order.customerPhone ?? "",
    order.user?.email ?? "",
    order.items.map((item) => `${item.productName} ×${item.quantity}`).join(" | "),
    order.subtotal,
    order.shippingCost,
    order.subtotal === null ? null : order.subtotal + (order.shippingCost ?? 0),
    orderStatusLabels[order.status],
    paid ? (paid.method === "doku" && paid.channel ? `doku (${paid.channel})` : paid.method) : "",
    order.externalRef ?? "",
    order.courierName ?? "",
    order.waybillId ?? "",
    csvDate(paid?.paidAt),
  ];
}

/** Isi file CSV: BOM UTF-8 agar Excel membaca huruf dengan benar, dan baris CRLF. */
export function ordersToCsv(orders: ExportOrder[]) {
  const lines = [orderCsvHeader, ...orders.map(orderCsvRow)].map((row) => row.map(csvCell).join(csvDelimiter));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}