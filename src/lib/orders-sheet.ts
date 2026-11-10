import type { Order } from "@/db/schema";
import { orderStatusLabels } from "@/lib/order-status";

/**
 * Model lembar Excel untuk export pesanan: nilai tiap baris, jenis kolom (teks / rupiah / tanggal-waktu), dan sel yang
 * siap ditulis. Sengaja tidak mengimpor library xlsx supaya bisa diuji sendiri; penulisan file ada di lib/orders-xlsx.
 */

/** Pesanan beserta relasi yang dibutuhkan export. */
export type ExportOrder = Pick<
  Order,
  "code" | "source" | "createdAt" | "customerName" | "customerPhone" | "phone" | "subtotal" | "shippingCost" | "status" | "courierName" | "waybillId" | "externalRef"
> & {
  user: { name: string | null; email: string } | null;
  items: { productName: string; quantity: number }[];
  payments: { method: string; channel: string | null; paidAt: Date | null }[];
};

export type Value = string | number | Date | null;
export type Kind = "text" | "rupiah" | "datetime";

/**
 * Kolom export. Kode, No. HP, No. nota, dan Resi bertipe teks agar angka nol di depan dan resi panjang tidak diubah Excel
 * menjadi angka atau notasi ilmiah. `width` dalam karakter.
 */
export const orderColumns: readonly { header: string; width: number; kind: Kind }[] = [
  { header: "Kode", width: 20, kind: "text" },
  { header: "Tanggal transaksi", width: 18, kind: "datetime" },
  { header: "Sumber", width: 11, kind: "text" },
  { header: "Pembeli", width: 22, kind: "text" },
  { header: "No. HP", width: 16, kind: "text" },
  { header: "Email", width: 28, kind: "text" },
  { header: "Produk", width: 50, kind: "text" },
  { header: "Subtotal", width: 14, kind: "rupiah" },
  { header: "Ongkir", width: 13, kind: "rupiah" },
  { header: "Total", width: 14, kind: "rupiah" },
  { header: "Status", width: 21, kind: "text" },
  { header: "Metode bayar", width: 24, kind: "text" },
  { header: "No. nota", width: 14, kind: "text" },
  { header: "Kurir", width: 22, kind: "text" },
  { header: "Resi", width: 18, kind: "text" },
  { header: "Tanggal bayar", width: 18, kind: "datetime" },
];

/** Angka kena format Rupiah tapi tetap angka, jadi bisa dijumlahkan. */
export const rupiahFormat = '"Rp" #,##0';
export const dateTimeFormat = "yyyy-mm-dd hh:mm";

const WIB = 7 * 60 * 60 * 1000;
/**
 * Waktu WIB sebagai nomor seri tanggal Excel (hari sejak 1899-12-30). Dihitung sendiri agar hasilnya sama di server
 * dengan zona waktu apa pun.
 */
export const excelSerial = (date: Date) => (date.getTime() + WIB) / 86_400_000 + 25569;

/** Pembayaran lunas paling awal; link DOKU yang dibuat ulang bisa menghasilkan beberapa baris, hanya satu yang lunas. */
const firstPaid = (order: ExportOrder) =>
  order.payments.filter((payment) => payment.paidAt).sort((a, b) => a.paidAt!.getTime() - b.paidAt!.getTime())[0];

/**
 * Tanggal transaksi: tanggal bayar untuk pesanan online (null bila belum dibayar), tanggal dibuat untuk langsung/historis.
 * Aturan yang sama dengan filter periode (lib/order-filter) dan laporan.
 */
export const transactionDate = (order: ExportOrder) => (order.source === "online" ? (firstPaid(order)?.paidAt ?? null) : order.createdAt);

/** Terbaru lebih dulu menurut tanggal transaksi; yang belum punya (online belum dibayar) di bawah, urut tanggal dibuat. */
export function sortByTransactionDate(orders: ExportOrder[]) {
  return [...orders].sort((a, b) => {
    const da = transactionDate(a)?.getTime();
    const db = transactionDate(b)?.getTime();
    if (da === undefined && db === undefined) return b.createdAt.getTime() - a.createdAt.getTime();
    if (da === undefined) return 1;
    if (db === undefined) return -1;
    return db - da;
  });
}

/** Satu baris export, urut sesuai `orderColumns`. Tanggal tetap berupa Date. */
export function orderRow(order: ExportOrder): Value[] {
  const paid = firstPaid(order);
  return [
    order.code,
    transactionDate(order),
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
    paid?.paidAt ?? null,
  ];
}

export type SheetCell = { t: "s" | "n"; v: string | number; z?: string };

/** Sel lembar untuk satu nilai; null/kosong tidak menghasilkan sel. Teks tetap teks (tidak pernah dibaca sebagai rumus). */
export function toCell(value: Value, kind: Kind): SheetCell | null {
  if (value === null || value === "") return null;
  if (value instanceof Date) return { t: "n", v: excelSerial(value), z: dateTimeFormat };
  if (typeof value === "number") return kind === "rupiah" ? { t: "n", v: value, z: rupiahFormat } : { t: "n", v: value };
  return { t: "s", v: value };
}

/** 0 -> A, 25 -> Z, 26 -> AA. */
export function columnName(index: number) {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

/** Sel header + semua baris (sudah diurutkan menurut tanggal transaksi), rentang lembar, dan lebar kolom. */
export function orderSheet(orders: ExportOrder[]) {
  const cells: Record<string, SheetCell> = {};
  orderColumns.forEach((column, c) => {
    cells[`${columnName(c)}1`] = { t: "s", v: column.header };
  });
  const rows = sortByTransactionDate(orders).map(orderRow);
  rows.forEach((row, r) =>
    row.forEach((value, c) => {
      const cell = toCell(value, orderColumns[c].kind);
      if (cell) cells[`${columnName(c)}${r + 2}`] = cell;
    }),
  );
  return {
    cells,
    ref: `A1:${columnName(orderColumns.length - 1)}${rows.length + 1}`,
    widths: orderColumns.map((column) => column.width),
  };
}