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

/** `noDefault`: tidak ada pilihan terisi, agar admin memilih dengan sadar. */
function RadioGroup({
  name,
  legend,
  options,
  noDefault,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string; hint: string }[];
  noDefault?: boolean;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="sr-only">{legend}</legend>
      {options.map((option, index) => (
        <label key={option.value} className="flex gap-3 rounded-md border border-line p-3 has-checked:border-accent">
          <input
            type="radio"
            name={name}
            value={option.value}
            defaultChecked={!noDefault && index === 0}
            required={noDefault}
            className="mt-1 accent-accent"
          />
          <span>
            <span className="block text-[15px]">{option.label}</span>
            <span className="block text-sm text-muted">{option.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/** Admin memesan kurir di Biteship; resi muncul setelah berhasil (revalidatePath memuat ulang halaman). */
export function ShipmentForm({ action }: { action: (state: State, formData: FormData) => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-3">
      <RadioGroup name="method" legend="Cara penyerahan paket" options={methods} />
      <ErrorAlert error={state.error} />
      <button className="btn mt-3 min-h-11 w-full px-4 text-[15px]" disabled={pending}>
        {pending ? "Memesan kurir…" : "Buat resi"}
      </button>
    </form>
  );
}

const payers = [
  { value: "pembeli", label: "Ongkir ditanggung pembeli", hint: "Mis. alamat salah atau penerima tidak ada di tempat." },
  { value: "sak_karepe", label: "Ongkir ditanggung Sak Karepe", hint: "Mis. kesalahan pengemasan atau kurir." },
];
const inputClass =
  "mt-1 w-full rounded-md border border-line bg-page px-3 py-2.5 text-[15px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Pesanan gagal kirim: admin mengonfirmasi atau mengubah alamat lalu memesan kurir baru; resi lama masuk riwayat. */
export function ResendShipmentForm({
  action,
  address,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  address: { recipientName: string; phone: string; shippingAddress: string; postalCode: string };
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const fields = [
    { name: "recipientName", label: "Nama penerima", autoComplete: "name" },
    { name: "phone", label: "Nomor HP", autoComplete: "tel" },
    { name: "shippingAddress", label: "Alamat", autoComplete: "street-address" },
    { name: "postalCode", label: "Kode pos", autoComplete: "postal-code" },
  ] as const;
  return (
    <form action={formAction} className="mt-3 grid gap-3">
      {fields.map((field) => (
        <label key={field.name} className="text-sm">
          {field.label}
          {field.name === "shippingAddress" ? (
            <textarea name={field.name} defaultValue={address[field.name]} required rows={3} className={inputClass} />
          ) : (
            <input
              name={field.name}
              defaultValue={address[field.name]}
              required
              autoComplete={field.autoComplete}
              inputMode={field.name === "phone" ? "tel" : field.name === "postalCode" ? "numeric" : undefined}
              className={inputClass}
            />
          )}
        </label>
      ))}
      <RadioGroup name="paidBy" legend="Penanggung ongkir pengiriman ulang" options={payers} noDefault />
      <RadioGroup name="method" legend="Cara penyerahan paket" options={methods} />
      <ErrorAlert error={state.error} />
      <button className="btn min-h-11 w-full px-4 text-[15px]" disabled={pending}>
        {pending ? "Memesan kurir…" : "Kirim ulang"}
      </button>
    </form>
  );
}

export function RefundButton({ action }: { action: () => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!confirm("Batalkan pesanan ini dan proses refund? Pesanan tidak bisa dikirim ulang setelahnya.")) event.preventDefault();
      }}
    >
      <button
        className="min-h-11 w-full rounded-md border border-danger px-4 text-[15px] font-medium text-danger transition-colors hover:bg-danger/10"
        disabled={pending}
      >
        {pending ? "Menyimpan…" : "Batalkan & refund"}
      </button>
      <ErrorAlert error={state.error} />
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

/** Dropdown status admin; hanya berisi perpindahan yang boleh dilakukan manual dari status sekarang. */
export function StatusForm({
  action,
  options,
}: {
  action: (state: State, formData: FormData) => Promise<State>;
  options: { value: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="rounded-md border border-line p-5">
      <label htmlFor="status" className="text-sm font-medium">Ubah status pesanan</label>
      <select
        id="status"
        name="status"
        className="mt-2 w-full rounded-md border border-line bg-page px-3 py-2.5 text-[15px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ErrorAlert error={state.error} />
      <button
        className="mt-3 min-h-11 w-full rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent"
        disabled={pending}
      >
        {pending ? "Menyimpan…" : "Simpan status"}
      </button>
    </form>
  );
}
