"use client";
import { useActionState, useEffect, useState, useTransition } from "react";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { LinkIcon } from "@/components/icons";
import Image from "@/components/site-image";
import type { Address } from "@/db/schema";
import { listAddresses, placeOrder, saveAddress, type AddressFormState } from "@/lib/checkout-actions";
import { formatRupiah } from "@/lib/format";

export type CheckoutProduct = {
  id: number;
  name: string;
  price: number | null;
  stock: number | null;
  image: { src: string; alt: string };
};

const field = "min-h-12 w-full rounded-md border border-line bg-page px-3.5 text-base focus:border-accent focus:outline-none";
const label = "mb-2 block text-sm font-medium";

/** Isi modal "Beli": jumlah, pilih alamat (atau isi alamat pertama), lalu catat pesanan dan buka WhatsApp. */
export function Checkout({ product }: { product: CheckoutProduct }) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{ code: string; whatsapp: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const maxQuantity = Math.min(product.stock ?? 99, 99);

  useEffect(() => {
    let active = true;
    listAddresses().then((list) => {
      if (!active) return;
      setAddresses(list);
      setSelected(list[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const submit = () => {
    if (!selected) return;
    setError("");
    startTransition(async () => {
      const result = await placeOrder({ productId: product.id, quantity, addressId: selected, notes });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPlaced(result);
      window.location.assign(result.whatsapp);
    });
  };

  if (placed)
    return (
      <div role="status">
        <p className="text-sm text-muted">Pesanan tercatat dengan kode</p>
        <p className="mt-1 text-2xl tracking-[-.03em]">{placed.code}</p>
        <p className="mt-4 text-muted">
          Membuka WhatsApp untuk mengonfirmasi harga, ongkos kirim, dan pembayaran dengan Sak Karepe. Kirim
          pesan yang sudah terisi tanpa menghapus atau mengubahnya.
        </p>
        <a className="btn mt-6" href={placed.whatsapp} target="_blank" rel="noopener noreferrer">
          Buka WhatsApp <LinkIcon />
        </a>
      </div>
    );

  const showForm = addresses !== null && (adding || addresses.length === 0);
  return (
    <>
      <div className="flex items-center gap-4">
        <div className="photo size-18 shrink-0">
          <Image className="object-cover" src={product.image.src} alt={product.image.alt} fill sizes="72px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{product.name}</p>
          <p className="text-sm text-muted">
            {product.price === null ? "Harga melalui konsultasi" : formatRupiah(product.price)}
          </p>
        </div>
        <div className="flex items-center rounded-md border border-line" role="group" aria-label="Jumlah">
          <button
            className="square size-10"
            aria-label="Kurangi jumlah"
            disabled={quantity <= 1}
            onClick={() => setQuantity(quantity - 1)}
          >
            <MinusIcon size={16} aria-hidden="true" />
          </button>
          <output className="w-8 text-center" aria-live="polite">
            {quantity}
          </output>
          <button
            className="square size-10"
            aria-label="Tambah jumlah"
            disabled={quantity >= maxQuantity}
            onClick={() => setQuantity(quantity + 1)}
          >
            <PlusIcon size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      <section className="mt-7 border-t border-line pt-6" aria-labelledby="address-title">
        <h3 id="address-title" className="text-lg tracking-[-.02em]">
          Alamat pengiriman
        </h3>
        {addresses === null ? (
          <p className="mt-4 text-sm text-muted">Memuat alamat…</p>
        ) : showForm ? (
          <AddressForm
            onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
            onSaved={(address) => {
              setAddresses([address, ...addresses]);
              setSelected(address.id);
              setAdding(false);
            }}
          />
        ) : (
          <fieldset className="mt-4">
            <legend className="sr-only">Pilih alamat</legend>
            <div className="space-y-3">
              {addresses.map((address) => (
                <label
                  key={address.id}
                  className="flex cursor-pointer gap-3 rounded-md border border-line p-4 has-checked:border-accent has-checked:bg-surface"
                >
                  <input
                    type="radio"
                    name="address"
                    className="mt-1 accent-(--accent)"
                    checked={selected === address.id}
                    onChange={() => setSelected(address.id)}
                  />
                  <span className="min-w-0 text-[15px]">
                    <span className="font-medium">{address.recipientName}</span>
                    <span className="text-muted"> · {address.phone}</span>
                    <span className="mt-1 block text-muted">
                      {address.street}, {address.district}, {address.city}, {address.province} {address.postalCode}
                    </span>
                    {address.notes && <span className="mt-1 block text-sm text-muted">Patokan: {address.notes}</span>}
                  </span>
                </label>
              ))}
            </div>
            <button className="text-link mt-4" onClick={() => setAdding(true)}>
              <PlusIcon size={16} aria-hidden="true" /> Tambah alamat baru
            </button>
          </fieldset>
        )}
      </section>

      {!showForm && addresses !== null && (
        <>
          <div className="mt-7 border-t border-line pt-6">
            <label htmlFor="order-notes" className={label}>
              Catatan untuk penjual <span className="font-normal text-muted">(opsional)</span>
            </label>
            <textarea
              id="order-notes"
              className="block min-h-20 w-full rounded-md border border-line bg-page p-3 text-ink"
              placeholder="Mis. ukuran, warna, atau motif yang diinginkan"
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="mt-6 flex items-baseline justify-between gap-4">
            <span className="text-muted">Subtotal</span>
            <span className="text-lg">
              {product.price === null ? "Dikonfirmasi penjual" : formatRupiah(product.price * quantity)}
            </span>
          </div>
          <p className="mt-2 text-sm text-muted">
            Ongkos kirim dan total pembayaran disepakati bersama penjual di WhatsApp.
          </p>
          {error && (
            <p role="alert" className="mt-4 text-sm text-ink">
              {error}
            </p>
          )}
          <button className="btn mt-6 w-full sm:w-auto" disabled={!selected || pending} onClick={submit}>
            {pending ? "Mencatat pesanan…" : "Pesan lewat WhatsApp"} <LinkIcon />
          </button>
        </>
      )}
    </>
  );
}

function AddressForm({ onSaved, onCancel }: { onSaved: (address: Address) => void; onCancel?: () => void }) {
  const [state, formAction, pending] = useActionState(async (previous: AddressFormState, formData: FormData) => {
    const result = await saveAddress(previous, formData);
    if (result.address) onSaved(result.address);
    return result;
  }, {});
  return (
    <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
      {!onCancel && <p className="text-sm text-muted sm:col-span-2">Isi alamat tujuan pengiriman pesananmu.</p>}
      <div>
        <label htmlFor="recipientName" className={label}>Nama penerima</label>
        <input id="recipientName" name="recipientName" required autoComplete="name" className={field} />
      </div>
      <div>
        <label htmlFor="phone" className={label}>Nomor HP</label>
        <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="08xxxxxxxxxx" className={field} />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="street" className={label}>Alamat lengkap</label>
        <textarea
          id="street"
          name="street"
          required
          autoComplete="street-address"
          placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan"
          className="block min-h-20 w-full rounded-md border border-line bg-page p-3 text-base focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="district" className={label}>Kecamatan</label>
        <input id="district" name="district" required autoComplete="address-level3" className={field} />
      </div>
      <div>
        <label htmlFor="city" className={label}>Kota/kabupaten</label>
        <input id="city" name="city" required autoComplete="address-level2" className={field} />
      </div>
      <div>
        <label htmlFor="province" className={label}>Provinsi</label>
        <input id="province" name="province" required autoComplete="address-level1" className={field} />
      </div>
      <div>
        <label htmlFor="postalCode" className={label}>Kode pos</label>
        <input
          id="postalCode"
          name="postalCode"
          required
          inputMode="numeric"
          pattern="\d{5}"
          maxLength={5}
          autoComplete="postal-code"
          className={field}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="notes" className={label}>
          Patokan <span className="font-normal text-muted">(opsional)</span>
        </label>
        <input id="notes" name="notes" placeholder="Mis. pagar hijau, dekat masjid" className={field} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-ink sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-5 sm:col-span-2">
        <button className="btn" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan alamat"}
        </button>
        {onCancel && (
          <button type="button" className="text-link" onClick={onCancel}>
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
