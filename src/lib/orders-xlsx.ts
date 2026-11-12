import * as XLSX from "xlsx";
import { orderSheet, type ExportOrder } from "@/lib/orders-sheet";

/**
 * File Excel (.xlsx) export pesanan memakai library xlsx yang sudah terpasang. Isi dan tipe sel ditentukan
 * lib/orders-sheet: teks (Kode, No. HP, No. nota, Resi), angka berformat "Rp" #,##0, dan sel tanggal WIB; lebar kolom
 * diatur dan header diberi autofilter. Header tebal/berwarna dan baris header yang tetap terlihat tidak didukung xlsx versi gratis.
 */
export function ordersToXlsx(orders: ExportOrder[]) {
  const { cells, ref, widths } = orderSheet(orders);
  const worksheet: XLSX.WorkSheet = { ...cells, "!ref": ref, "!cols": widths.map((wch) => ({ wch })), "!autofilter": { ref } };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pesanan");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }) as Buffer;
}