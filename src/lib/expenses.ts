import type { Expense } from "@/db/schema";

export const expenseCategoryLabels: Record<Expense["category"], string> = {
  modal: "Modal/bahan",
  ongkir: "Ongkir ditanggung toko",
  pembayaran: "Biaya pembayaran",
  operasional: "Operasional",
  lainnya: "Lainnya",
};
