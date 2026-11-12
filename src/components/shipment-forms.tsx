"use client";
import { startTransition, useActionState, useState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";

type State = { error?: string; dashboard?: boolean };

function ErrorAlert({ error, dashboard }: State) {
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 flex gap-2 text-sm text-danger">
      <WarningCircleIcon size={18} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
      <span>
        {error}
        {dashboard && (
          <>
            {" "}
            <a className="text-link" href="https://dashboard.biteship.com" target="_blank" rel="noreferrer">
              Buka dashboard Biteship
            </a>
          </>
        )}
      </span>
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
  value,
  onChange,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string; hint: string }[];
  noDefault?: boolean;
  value?: string;
  onChange?: (value: string) => void;
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
            checked={value !== undefined ? value === option.value : undefined}
            defaultChecked={value === undefined ? !noDefault && index === 0 : undefined}
            required={noDefault}
            onChange={(event) => onChange?.(event.target.value)}
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
      <ErrorAlert {...state} />
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
  const [values, setValues] = useState({
    recipientName: address.recipientName,
    phone: address.phone,
    shippingAddress: address.shippingAddress,
    postalCode: address.postalCode,
  });
  const [paidBy, setPaidBy] = useState("");
  const [method, setMethod] = useState(methods[0].value);
  const fields = [
    { name: "recipientName", label: "Nama penerima", autoComplete: "name" },
    { name: "phone", label: "Nomor HP", autoComplete: "tel" },
    { name: "shippingAddress", label: "Alamat", autoComplete: "street-address" },
    { name: "postalCode", label: "Kode pos", autoComplete: "postal-code" },
  ] as const;
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="mt-3 grid gap-3"
    >
      {fields.map((field) => (
        <label key={field.name} className="text-sm">
          {field.label}
          {field.name === "shippingAddress" ? (
            <textarea
              name={field.name}
              value={values[field.name]}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
              required
              rows={3}
              className={inputClass}
            />
          ) : (
            <input
              name={field.name}
              value={values[field.name]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [field.name]: field.name === "postalCode" ? event.target.value.replace(/\D/g, "") : event.target.value,
                }))
              }
              required
              autoComplete={field.autoComplete}
              inputMode={field.name === "phone" ? "tel" : field.name === "postalCode" ? "numeric" : undefined}
              pattern={field.name === "phone" ? "[+]?(?:62|0)\\d{8,13}" : field.name === "postalCode" ? "\\d{5}" : undefined}
              maxLength={field.name === "postalCode" ? 5 : undefined}
              className={inputClass}
            />
          )}
        </label>
      ))}
      <RadioGroup
        name="paidBy"
        legend="Penanggung ongkir pengiriman ulang"
        options={payers}
        noDefault
        value={paidBy}
        onChange={setPaidBy}
      />
      <RadioGroup name="method" legend="Cara penyerahan paket" options={methods} value={method} onChange={setMethod} />
      <ErrorAlert {...state} />
      <button className="btn min-h-11 w-full px-4 text-[15px] disabled:pointer-events-none disabled:opacity-50" disabled={pending || !paidBy}>
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
  const [status, setStatus] = useState("");
  const [state, formAction, pending] = useActionState(async (previous: State, formData: FormData) => {
    const result = await action(previous, formData);
    if (!result.error) setStatus("");
    return result;
  }, {});
  const selectedStatus = options.some((option) => option.value === status) ? status : "";
  return (
    <form action={formAction} className="rounded-md border border-line p-5">
      <label htmlFor="status" className="text-sm font-medium">Ubah status pesanan</label>
      <select
        id="status"
        name="status"
        required
        value={selectedStatus}
        onChange={(event) => setStatus(event.target.value)}
        className="mt-2 w-full rounded-md border border-line bg-page px-3 py-2.5 text-[15px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <option value="" disabled>
          Pilih status
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ErrorAlert error={state.error} />
      <button
        className="mt-3 min-h-11 w-full rounded-md border border-line px-4 text-[15px] font-medium transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        disabled={pending || !selectedStatus}
      >
        {pending ? "Menyimpan…" : "Simpan status"}
      </button>
    </form>
  );
}

/** Catatan internal admin di riwayat pesanan; form dikosongkan React setelah tersimpan. */
export function NoteForm({ action }: { action: (state: State, formData: FormData) => Promise<State> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-4">
      <label htmlFor="note" className="text-sm font-medium">Catatan internal</label>
      <textarea id="note" name="note" required maxLength={2000} rows={3} className={inputClass} />
      <p className="mt-1 text-sm text-muted">Hanya terlihat oleh admin.</p>
      <ErrorAlert error={state.error} />
      <button
        className="mt-3 min-h-11 rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent"
        disabled={pending}
      >
        {pending ? "Menyimpan…" : "Simpan catatan"}
      </button>
    </form>
  );
}

/** Tombol satu aksi tanpa isian, mis. cek ulang status atau menandai sudah dicek; `confirmText` ditanyakan dulu. */
export function ActionButton({
  action,
  label,
  pendingLabel,
  confirmText,
}: {
  action: () => Promise<State>;
  label: string;
  pendingLabel: string;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmText && !confirm(confirmText)) event.preventDefault();
      }}
    >
      <button
        className="min-h-11 w-full rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent"
        disabled={pending}
      >
        {pending ? pendingLabel : label}
      </button>
      <ErrorAlert error={state.error} />
    </form>
  );
}

/** Tambah admin lewat email, termasuk email yang belum pernah login; form dikosongkan React setelah tersimpan. */
export function AddAdminForm({ action }: { action: (state: State & { message?: string }, formData: FormData) => Promise<State & { message?: string }> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="mt-6 max-w-md rounded-md border border-line p-5">
      <label htmlFor="admin-email" className="text-sm font-medium">Tambah admin lewat email</label>
      <input id="admin-email" name="email" type="email" required maxLength={254} autoComplete="off" placeholder="nama@gmail.com" className={inputClass} />
      <p className="mt-1 text-sm text-muted">Akun Google dengan email ini langsung bisa membuka dashboard admin.</p>
      <ErrorAlert error={state.error} />
      {state.message && <p role="status" className="mt-3 text-sm text-accent">{state.message}</p>}
      <button
        className="mt-3 min-h-11 rounded-md border border-line px-4 text-[15px] font-medium transition-colors hover:border-accent hover:text-accent"
        disabled={pending}
      >
        {pending ? "Menyimpan…" : "Jadikan admin"}
      </button>
    </form>
  );
}
