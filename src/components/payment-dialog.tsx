"use client";
import { useActionState, useRef, useState } from "react";
import { CheckCircleIcon, CopyIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { CloseIcon } from "@/components/icons";
import type { PaymentFormState } from "@/lib/order-actions";

type Item = { id: number; name: string; quantity: number; price: number | null };
type Props = {
  action: (state: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;
  items: Item[];
  shippingCost: number | null;
  /** Untuk pesan WhatsApp ke pembeli setelah link jadi. */
  buyer: { name: string; phone: string; code: string };
  label: string;
};

const rupiah = new Intl.NumberFormat("id-ID");
const dateTime = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const digits = (value: string) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

export function PaymentDialog(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Mengganti key mereset form (dan hasil action) setiap kali modal dibuka.
  const [session, setSession] = useState(0);
  const open = () => {
    setSession((value) => value + 1);
    dialog.current?.showModal();
  };
  return (
    <>
      <button type="button" className="btn min-h-11 w-full px-4 text-[15px]" onClick={open}>
        {props.label}
      </button>
      <dialog
        ref={dialog}
        className="checkout-dialog"
        aria-labelledby="payment-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-page px-5 py-4 md:px-7">
          <h2 id="payment-title" className="text-[22px] tracking-[-.03em]">Buat pembayaran</h2>
          <button type="button" className="square -mr-2 size-10 text-muted" aria-label="Tutup dialog" onClick={() => dialog.current?.close()}>
            <CloseIcon />
          </button>
        </div>
        {session > 0 && <PaymentForm key={session} {...props} />}
      </dialog>
    </>
  );
}

function PaymentForm({ action, items, shippingCost, buyer }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [prices, setPrices] = useState(() => items.map((item) => (item.price ? String(item.price) : "")));
  const [shipping, setShipping] = useState(shippingCost ? String(shippingCost) : "");
  const [copied, setCopied] = useState(false);
  const total = items.reduce((sum, item, index) => sum + Number(prices[index] || 0) * item.quantity, 0) + Number(shipping || 0);

  if (state.url) {
    const message = `Halo ${buyer.name}, berikut link pembayaran pesanan ${buyer.code} dari Sak Karepe:\n${state.url}\n\nTotal ${"Rp" + rupiah.format(total)}. Link berlaku sampai ${dateTime.format(new Date(state.expiresAt!))} WIB.`;
    return (
      <div className="px-5 py-8 md:px-7">
        <CheckCircleIcon size={40} weight="light" className="text-accent" aria-hidden="true" />
        <p className="mt-4 text-xl tracking-[-.03em]">Link pembayaran siap.</p>
        <p className="mt-1 text-[15px] text-muted">
          Total Rp{rupiah.format(total)}, berlaku sampai {dateTime.format(new Date(state.expiresAt!))} WIB. Status pesanan
          menjadi Menunggu pembayaran.
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-md border border-line bg-surface/50 py-1.5 pr-1.5 pl-3.5">
          <p className="min-w-0 flex-1 truncate font-mono text-sm">{state.url}</p>
          <button
            type="button"
            className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-sm hover:bg-surface"
            onClick={() => navigator.clipboard.writeText(state.url!).then(() => setCopied(true))}
          >
            <CopyIcon size={16} aria-hidden="true" /> {copied ? "Tersalin" : "Salin"}
          </button>
        </div>
        <a
          href={`https://wa.me/${buyer.phone.replace(/^0/, "62")}?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn mt-4 w-full gap-2"
        >
          <WhatsappLogoIcon size={20} aria-hidden="true" /> Kirim ke pembeli
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="px-5 pt-6 md:px-7">
      <p className="text-[15px] text-muted">
        Harga terisi dari katalog. Ubah sesuai hasil kesepakatan dengan pembeli, lalu buat link DOKU Checkout.
      </p>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {items.map((item, index) => (
          <li key={item.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:gap-4">
            <label htmlFor={`price-${item.id}`} className="min-w-0">
              <span className="line-clamp-2">{item.name}</span>
              <span className="text-sm text-muted">
                {item.quantity} barang · harga satuan{item.price === null && " (konsultasi)"}
              </span>
            </label>
            <AmountInput
              id={`price-${item.id}`}
              value={prices[index]}
              required
              onChange={(value) => setPrices((current) => current.map((price, i) => (i === index ? value : price)))}
            />
          </li>
        ))}
        <li className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:gap-4">
          <label htmlFor="shippingCost">
            Ongkos kirim <span className="text-sm text-muted">(opsional)</span>
          </label>
          <AmountInput id="shippingCost" value={shipping} onChange={setShipping} />
        </li>
      </ul>
      {state.error && (
        <p role="alert" className="mt-4 text-sm text-ink">
          {state.error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-5 mt-6 flex items-center justify-between gap-4 border-t border-line bg-page px-5 py-4 md:-mx-7 md:px-7">
        <div>
          <p className="text-sm text-muted">Total</p>
          <p className="text-lg font-medium tabular-nums">Rp{rupiah.format(total)}</p>
        </div>
        <button className="btn min-h-12" disabled={pending || total === 0}>
          {pending ? "Membuat link…" : "Buat link pembayaran"}
        </button>
      </div>
    </form>
  );
}

function AmountInput({ id, value, required, onChange }: { id: string; value: string; required?: boolean; onChange: (value: string) => void }) {
  return (
    <div className="flex min-h-12 items-center rounded-md border border-line bg-page focus-within:border-accent">
      <span className="pl-3.5 text-muted">Rp</span>
      <input
        id={id}
        name={id}
        inputMode="numeric"
        autoComplete="off"
        required={required}
        value={value ? rupiah.format(Number(value)) : ""}
        onChange={(event) => onChange(digits(event.target.value))}
        className="min-w-0 flex-1 bg-transparent px-2 py-3 text-right tabular-nums focus:outline-none"
      />
    </div>
  );
}
