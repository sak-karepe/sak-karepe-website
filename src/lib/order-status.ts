import { orderStatuses, type Order } from "@/db/schema";

export const orderStatusLabels: Record<Order["status"], string> = {
  menunggu_konfirmasi: "Menunggu konfirmasi",
  menunggu_pembayaran: "Menunggu pembayaran",
  dibayar: "Dibayar",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const isOrderStatus = (value: unknown): value is Order["status"] =>
  orderStatuses.includes(value as Order["status"]);

/** Pesanan aktif berupa garis, yang sudah berjalan diberi warna, yang batal dibuat redup. */
export function orderStatusClass(status: Order["status"]) {
  if (status === "selesai") return "bg-accent text-button-ink";
  if (status === "dibayar" || status === "dikirim") return "bg-surface text-accent";
  if (status === "dibatalkan") return "border border-dashed border-line text-muted";
  return "border border-line";
}
