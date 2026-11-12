"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { expenseCategories, expenses, orders } from "@/db/schema";
import { parseAmount } from "@/lib/format";
import { parseDay } from "@/lib/report-period";

export type ExpenseFormState = { error?: string };

const listPath = "/admin/keuangan/pengeluaran";

/** Mencatat pengeluaran baru, atau mengubahnya bila form membawa `id`. Kembali ke daftar dengan filter yang sama (`back`). */
export async function saveExpense(_state: ExpenseFormState, formData: FormData): Promise<ExpenseFormState> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id")) || undefined;
  const spentAt = parseDay(String(formData.get("date") ?? ""));
  if (!spentAt || spentAt.getTime() > Date.now()) return { error: "Tanggal tidak valid atau di masa depan." };
  const category = expenseCategories.find((value) => value === formData.get("category"));
  if (!category) return { error: "Pilih kategori pengeluaran." };
  const amount = parseAmount(formData.get("amount"));
  if (!amount || amount > 1_000_000_000_000) return { error: "Isi jumlah pengeluaran lebih dari 0." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  const code = String(formData.get("orderCode") ?? "").trim().toUpperCase();
  let orderId: number | null = null;
  if (code) {
    const order = await db.query.orders.findFirst({ columns: { id: true }, where: eq(orders.code, code) });
    if (!order) return { error: `Pesanan ${code} tidak ditemukan.` };
    orderId = order.id;
  }

  const values = { spentAt, category, amount, note, orderId };
  if (id) await db.update(expenses).set({ ...values, updatedAt: new Date() }).where(eq(expenses.id, id));
  else await db.insert(expenses).values({ ...values, recordedBy: Number(admin.id) });
  revalidatePath("/admin", "layout");
  const back = String(formData.get("back") ?? "");
  redirect(back.startsWith(`${listPath}?`) ? back : listPath);
}

export async function deleteExpense(id: number) {
  await requireAdmin();
  await db.delete(expenses).where(eq(expenses.id, id));
  revalidatePath("/admin", "layout");
}
