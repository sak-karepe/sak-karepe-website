import { orderStatuses, type Order } from "@/db/schema";

export const orderStatusLabels: Record<Order["status"], string> = {
  menunggu_konfirmasi: "Menunggu konfirmasi",
  menunggu_checkout: "Menunggu checkout",
  menunggu_pembayaran: "Menunggu pembayaran",
  dibayar: "Dibayar",
  dikirim: "Dalam pengiriman",
  sampai: "Pesanan sampai",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

/** Status yang belum dibayar: pembeli masih bisa membatalkan dan admin masih bisa mengubah harga. */
export const checkoutStatuses: Order["status"][] = ["menunggu_konfirmasi", "menunggu_checkout", "menunggu_pembayaran"];

export const isOrderStatus = (value: unknown): value is Order["status"] =>
  orderStatuses.includes(value as Order["status"]);

/** Pesanan aktif berupa garis, yang sudah berjalan diberi warna, yang batal dibuat redup. */
export function orderStatusClass(status: Order["status"]) {
  if (status === "selesai") return "bg-accent text-button-ink";
  if (status === "dibayar" || status === "dikirim" || status === "sampai") return "bg-surface text-accent";
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
