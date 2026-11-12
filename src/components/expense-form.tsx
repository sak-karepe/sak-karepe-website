"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { AmountInput } from "@/components/checkout-link-dialog";
import { expenseCategoryLabels } from "@/lib/expenses";
import { saveExpense } from "@/lib/expense-actions";

const field = "min-h-12 w-full rounded-md border border-line bg-page px-3.5 text-base focus:border-accent focus:outline-none";
const label = "mb-2 block text-sm font-medium";

export type ExpenseFormValues = { id?: number; date: string; category: string; amount: number | null; note: string; orderCode: string };

/** Form catat/ubah pengeluaran; isian tetap ada bila server menolak (field controlled). */
export function ExpenseForm({ values, back }: { values: ExpenseFormValues; back: string }) {
  const [state, formAction, pending] = useActionState(saveExpense, {});
  const [amount, setAmount] = useState(values.amount ? String(values.amount) : "");
  const [date, setDate] = useState(values.date);
  const [category, setCategory] = useState(values.category);
  const [note, setNote] = useState(values.note);
  const [orderCode, setOrderCode] = useState(values.orderCode);

  return (
    <form action={formAction} className="grid gap-5 rounded-2xl border border-line p-5 md:grid-cols-2 md:p-6">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <input type="hidden" name="back" value={back} />
      <div>
        <label htmlFor="date" className={label}>Tanggal</label>
        <input id="date" name="date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={field} />
      </div>
      <div>
        <label htmlFor="category" className={label}>Kategori</label>
        <select id="category" name="category" required value={category} onChange={(event) => setCategory(event.target.value)} className={field}>
          <option value="" disabled>Pilih kategori</option>
          {Object.entries(expenseCategoryLabels).map(([value, text]) => (
            <option key={value} value={value}>{text}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="amount" className={label}>Jumlah</label>
        <AmountInput id="amount" required value={amount} onChange={setAmount} />
      </div>
      <div>
        <label htmlFor="orderCode" className={label}>
          Kode pesanan <span className="font-normal text-muted">(opsional)</span>
        </label>
        <input id="orderCode" name="orderCode" placeholder="SK-..." value={orderCode} onChange={(event) => setOrderCode(event.target.value)} className={`${field} font-mono uppercase`} />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="note" className={label}>
          Keterangan <span className="font-normal text-muted">(opsional)</span>
        </label>
        <input id="note" name="note" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} className={field} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-danger md:col-span-2">{state.error}</p>
      )}
      <div className="flex items-center gap-5 md:col-span-2">
        <button className="btn min-h-12 px-6" disabled={pending}>
          {pending ? "Menyimpan…" : values.id ? "Simpan perubahan" : "Catat pengeluaran"}
        </button>
        {values.id && <Link href={back} className="text-[15px] text-muted hover:text-ink">Batal</Link>}
      </div>
    </form>
  );
}
