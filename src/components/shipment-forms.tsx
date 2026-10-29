"use client";
import { useActionState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";

type State = { error?: string };

function ErrorAlert({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 flex gap-2 text-sm text-danger">
      <WarningCircleIcon size={18} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
      {error}
    </p>
  );
}

const methods = [
  { value: "pickup", label: "Kurir menjemput", hint: "Kurir datang mengambil paket ke alamat Sak Karepe." },
  { value: "drop_off", label: "Antar ke agen kurir", hint: "Admin membawa paket ke agen/gerai kurir." },
];

/** Admin memesan kurir di Biteship; resi muncul setelah berhasil (revalidatePath memuat ulang halaman). */
export function ShipmentForm({ action }: { action: (state: State, formData: FormData) => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-3">
      <fieldset className="grid gap-2">
        <legend className="sr-only">Cara penyerahan paket</legend>
        {methods.map((method, index) => (
          <label key={method.value} className="flex gap-3 rounded-md border border-line p-3 has-checked:border-accent">
            <input type="radio" name="method" value={method.value} defaultChecked={index === 0} className="mt-1 accent-accent" />
            <span>
              <span className="block text-[15px]">{method.label}</span>
              <span className="block text-sm text-muted">{method.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <ErrorAlert error={state.error} />
      <button className="btn mt-3 min-h-11 w-full px-4 text-[15px]" disabled={pending}>
        {pending ? "Memesan kurir…" : "Buat resi"}
      </button>
    </form>
  );
}

export function ConfirmReceived({ action }: { action: () => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      <button className="btn min-h-11 w-full px-4 text-[15px]" disabled={pending}>
        {pending ? "Menyimpan…" : "Pesanan sudah diterima"}
      </button>
      <ErrorAlert error={state.error} />
    </form>
  );
}
