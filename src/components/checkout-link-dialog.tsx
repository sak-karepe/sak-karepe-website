"use client";
import { useActionState, useRef, useState } from "react";
import { CheckCircleIcon, CopyIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { CloseIcon } from "@/components/icons";
import { basePath } from "@/lib/assets";
import type { CheckoutLinkFormState } from "@/lib/order-actions";

type Item = { id: number; name: string; quantity: number; price: number | null };
type Props = {
  action: (state: CheckoutLinkFormState, formData: FormData) => Promise<CheckoutLinkFormState>;
  items: Item[];
  code: string;
  label: string;
};

const rupiah = new Intl.NumberFormat("id-ID");
const digits = (value: string) => value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

/** Halaman checkout pembeli; hanya bisa dibuka akun pemilik pesanan. */
const checkoutUrl = (code: string) => `${window.location.origin}${basePath}/pesanan/${code}/checkout`;

/** Tombol salin dengan tanda "Tersalin". `text` dibuat saat diklik karena butuh `window`. */
export function CopyButton({ text, label, className = "" }: { text: () => string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-1.5 ${className}`}
      onClick={() => navigator.clipboard.writeText(text()).then(() => setCopied(true))}
    >
      <CopyIcon size={16} aria-hidden="true" /> {copied ? "Tersalin" : label}
    </button>
  );
}

export function CopyCheckoutLink({ code }: { code: string }) {
  return (
    <CopyButton
      text={() => checkoutUrl(code)}
      label="Salin link checkout"
      className="min-h-11 w-full rounded-md border border-line px-4 text-[15px] transition-colors hover:border-accent hover:text-accent"
    />
  );
}

export function CheckoutLinkDialog(props: Props) {
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
        aria-labelledby="checkout-link-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) dialog.current?.close();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-surface px-5 py-4 md:px-7">
          <h2 id="checkout-link-title" className="text-[22px] tracking-[-.03em]">Buat link checkout</h2>
          <button type="button" className="square -mr-2 size-10 text-muted" aria-label="Tutup dialog" onClick={() => dialog.current?.close()}>
            <CloseIcon />
          </button>
        </div>
        {session > 0 && <CheckoutLinkForm key={session} {...props} />}
      </dialog>
    </>
  );
}

function CheckoutLinkForm({ action, items, code }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [prices, setPrices] = useState(() => items.map((item) => (item.price ? String(item.price) : "")));
  const subtotal = items.reduce((sum, item, index) => sum + Number(prices[index] || 0) * item.quantity, 0);

  if (state.saved) {
    const url = checkoutUrl(code);
    const message = `Halo, berikut link checkout pesanan ${code} dari Sak Karepe:\n${url}\n\nSubtotal produk Rp${rupiah.format(subtotal)}. Masuk dengan akun Google yang dipakai saat memesan, isi alamat pengiriman, lalu lanjutkan ke pembayaran. Ongkos kirim dihitung setelah alamat diisi.`;
    return (
      <div className="px-5 py-8 md:px-7">
        <CheckCircleIcon size={40} weight="light" className="text-accent" aria-hidden="true" />
        <p className="mt-4 text-xl tracking-[-.03em]">Link checkout siap.</p>
        <p className="mt-1 text-[15px] text-muted">
          Subtotal Rp{rupiah.format(subtotal)}. Status pesanan menjadi Menunggu checkout. Kirim link ini ke pembeli lewat
          WhatsApp; link pembayaran DOKU dibuat setelah pembeli mengisi alamat.
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-md bg-surface py-1.5 pr-1.5 pl-3.5">
          <p className="min-w-0 flex-1 truncate text-sm">{url}</p>
          <CopyButton text={() => url} label="Salin" className="shrink-0 rounded-md px-3 py-2 text-sm hover:bg-page" />
        </div>
        <CopyButton text={() => message} label="Salin pesan untuk pembeli" className="btn mt-4 w-full" />
      </div>
    );
  }

  return (
    <form action={formAction} className="px-5 pt-6 md:px-7">
      <p className="text-[15px] text-muted">
        Harga terisi dari katalog. Ubah sesuai hasil kesepakatan dengan pembeli. Ongkos kirim dihitung otomatis saat pembeli
        mengisi alamat di halaman checkout.
      </p>
      <ul className="mt-5 grid gap-2">
        {items.map((item, index) => (
          <li key={item.id} className="grid gap-2 rounded-md bg-surface px-4 py-4 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-center sm:gap-4">
            <label htmlFor={`price-${item.id}`} className="min-w-0">
              <span className="line-clamp-2">{item.name}</span>
              <span className="block text-sm text-muted">
                {item.quantity} barang · harga satuan{item.price === null && " (konsultasi)"}
              </span>
              <span className="block text-sm tabular-nums">
                {item.quantity} × Rp{rupiah.format(Number(prices[index] || 0))} ={" "}
                <span className="font-medium">Rp{rupiah.format(Number(prices[index] || 0) * item.quantity)}</span>
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
      </ul>
      {state.error && (
        <p
          role="alert"
          className="mt-4 flex gap-2.5 rounded-md border border-danger/35 bg-danger/8 px-3.5 py-3 text-sm text-danger"
        >
          <WarningCircleIcon size={18} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
          {state.error}
        </p>
      )}
      <div className="sticky bottom-0 -mx-5 mt-6 flex items-center justify-between gap-4 bg-surface px-5 py-4 md:-mx-7 md:px-7">
        <div>
          <p className="text-sm text-muted">Subtotal</p>
          <p className="text-lg font-medium tabular-nums">Rp{rupiah.format(subtotal)}</p>
        </div>
        <button className="btn min-h-12" disabled={pending || subtotal === 0}>
          {pending ? "Menyimpan…" : "Buat link checkout"}
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
