import { orderStatuses, type Order, type Payment } from "@/db/schema";

export const orderStatusLabels: Record<Order["status"], string> = {
  menunggu_konfirmasi: "Menunggu konfirmasi",
  menunggu_checkout: "Menunggu checkout",
  menunggu_pembayaran: "Menunggu pembayaran",
  dibayar: "Dibayar",
  dikirim: "Dalam pengiriman",
  gagal_kirim: "Gagal kirim",
  sampai: "Pesanan sampai",
  retur: "Retur",
  selesai: "Selesai",
  refund: "Proses refund",
  dibatalkan: "Dibatalkan",
};

export const orderSourceLabels: Record<Order["source"], string> = {
  online: "Online",
  langsung: "Penjualan langsung",
  historis: "Transaksi lama",
};

export const paymentMethodLabels: Record<Payment["method"], string> = {
  doku: "DOKU",
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
  lainnya: "Lainnya",
};

/** Status yang belum dibayar: pembeli masih bisa membatalkan dan admin masih bisa mengubah harga. */
export const checkoutStatuses: Order["status"][] = ["menunggu_konfirmasi", "menunggu_checkout", "menunggu_pembayaran"];

export const isOrderStatus = (value: unknown): value is Order["status"] =>
  orderStatuses.includes(value as Order["status"]);

/**
 * Satu-satunya daftar perpindahan status yang sah, untuk admin, pembeli, webhook, dan job. Pesanan yang sudah dibayar
 * hanya bisa batal lewat refund, dan "dikirim" hanya lewat booking kurir (resi). "selesai" dan "dibatalkan" final.
 */
export const orderTransitions: Record<Order["status"], Order["status"][]> = {
  // Harga bisa diubah lagi (kembali ke menunggu_checkout) selama belum dibayar; "dibayar" dari notifikasi DOKU, yang
  // menerima semua checkoutStatuses; "dibatalkan" oleh pembeli, admin, atau job kedaluwarsa.
  menunggu_konfirmasi: ["menunggu_checkout", "dibayar", "dibatalkan"],
  menunggu_checkout: ["menunggu_checkout", "menunggu_pembayaran", "dibayar", "dibatalkan"],
  menunggu_pembayaran: ["menunggu_checkout", "menunggu_pembayaran", "dibayar", "dibatalkan"],
  dibayar: ["dikirim", "refund"],
  // Booking gagal di Biteship melepas resi (kembali "dibayar"); paket dikembalikan kurir menjadi "gagal_kirim".
  dikirim: ["dibayar", "gagal_kirim", "sampai"],
  gagal_kirim: ["dikirim", "refund"],
  sampai: ["selesai", "retur"],
  // Komplain ditolak kembali ke "sampai"; disetujui berakhir refund atau kirim pengganti.
  retur: ["sampai", "refund", "dikirim"],
  selesai: [],
  refund: ["dibatalkan"],
  dibatalkan: [],
};

/** Status awal pesanan per sumber; penjualan langsung "dibayar" bila barang masih perlu dikirim. */
export const initialStatuses: Record<Order["source"], Order["status"][]> = {
  online: ["menunggu_konfirmasi"],
  langsung: ["dibayar", "selesai"],
  historis: ["selesai"],
};

/**
 * Perpindahan yang boleh lewat dropdown admin. Sisanya punya alur sendiri yang menyimpan data pendukung: link checkout,
 * pembayaran DOKU, resi kurir, refund, retur.
 */
export const adminTransitions: Partial<Record<Order["status"], Order["status"][]>> = {
  menunggu_konfirmasi: ["dibatalkan"],
  menunggu_checkout: ["dibatalkan"],
  menunggu_pembayaran: ["dibatalkan"],
  dikirim: ["sampai"],
  sampai: ["selesai"],
};

/** Pesanan aktif berupa garis, yang sudah berjalan diberi warna, yang batal dibuat redup. */
export function orderStatusClass(status: Order["status"]) {
  if (status === "selesai") return "bg-accent text-button-ink";
  if (status === "dibayar" || status === "dikirim" || status === "sampai") return "bg-surface text-accent";
  if (status === "gagal_kirim" || status === "retur" || status === "refund") return "border border-danger text-danger";
  if (status === "dibatalkan") return "border border-dashed border-line text-muted";
  return "border border-line";
}

/** Status order Biteship yang dilihat pembeli dan admin; status di luar daftar ditampilkan "Diproses kurir". */
export const shipmentStatusLabels: Record<string, string> = {
  confirmed: "Menunggu kurir",
  scheduled: "Penjemputan dijadwalkan",
  allocated: "Kurir sudah ditugaskan",
  picking_up: "Kurir menuju lokasi penjemputan",
  picked: "Paket sudah diambil kurir",
  dropping_off: "Paket dalam perjalanan ke alamat tujuan",
  on_hold: "Pengiriman tertunda",
  delivered: "Paket sudah sampai",
  return_in_transit: "Paket dikembalikan ke pengirim",
  returned: "Paket dikembalikan ke pengirim",
};

/** Paket sudah di tangan kurir: link lacak ditampilkan. */
export const handedOverStatuses = ["picked", "dropping_off", "on_hold", "delivered"];
