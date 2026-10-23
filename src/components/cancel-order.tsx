"use client";
import { useActionState, useState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import type { CancelOrderState } from "@/lib/checkout-actions";

/** Tombol batalkan dengan konfirmasi di tempat; sesudah berhasil, halaman dimuat ulang oleh revalidatePath. */
export function CancelOrder({
  action,
  hasPaymentLink,
}: {
  action: () => Promise<CancelOrderState>;
  hasPaymentLink: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as CancelOrderState);
  const [confirming, setConfirming] = useState(false);
  if (!confirming)
    return (
      <button
        type="button"
        className="min-h-11 w-full rounded-md border border-line px-4 text-[15px] text-muted transition-colors hover:border-danger hover:text-danger"
        onClick={() => setConfirming(true)}
      >
        Batalkan pesanan
      </button>
    );
  return (
    <form action={formAction} className="rounded-md border border-danger/35 bg-danger/8 p-4">
      <p className="text-[15px] font-medium">Batalkan pesanan ini?</p>
      <p className="mt-1 text-sm text-muted">
        Pesanan yang dibatalkan tidak bisa diaktifkan lagi.{hasPaymentLink && " Link pembayaran DOKU-nya juga dibatalkan."}
      </p>
      {state.error && (
        <p role="alert" className="mt-3 flex gap-2 text-sm text-danger">
          <WarningCircleIcon size={18} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
          {state.error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          className="min-h-11 flex-1 rounded-md bg-danger px-4 text-[15px] font-medium text-page disabled:opacity-60"
          disabled={pending}
        >
          {pending ? "Membatalkan…" : "Ya, batalkan"}
        </button>
        <button
          type="button"
          className="min-h-11 flex-1 rounded-md border border-line bg-page px-4 text-[15px]"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Tidak
        </button>
      </div>
    </form>
  );
}
