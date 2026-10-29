"use client";
import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { CaretDownIcon, CheckCircleIcon, MinusIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useSession } from "next-auth/react";
import { LinkIcon } from "@/components/icons";
import { useSite } from "@/components/site-shell";
import Image from "@/components/site-image";
import type { RegionOption } from "@/app/api/regions/route";
import type { Address } from "@/db/schema";
import { formatAddress } from "@/lib/address";
import { basePath } from "@/lib/assets";
import { listAddresses, placeOrder, saveAddress, type AddressFormState } from "@/lib/checkout-actions";
import { formatRupiah } from "@/lib/format";

export type CheckoutProduct = {
  id: number;
  name: string;
  price: number | null;
  stock: number | null;
  image: { src: string; alt: string };
};

export type CartItem = CheckoutProduct & { quantity: number };

/** Batas jumlah per produk: stok bila diisi, maksimal 99 (sama dengan validasi placeOrder). */
export const maxQuantity = (product: CheckoutProduct) => Math.min(product.stock ?? 99, 99);

const field =
  "h-11 w-full rounded-md border border-line bg-transparent px-3 text-[15px] text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50";
const label = "mb-1.5 block text-[13px] font-medium text-muted";
/** Mengisi lebar penuh area konten dialog (padding px-5 / md:px-7 di SiteShell). */
const bleed = "-mx-5 px-5 md:-mx-7 md:px-7";

/**
 * Isi modal keranjang: jumlah per produk dan catatan, lalu catat semuanya sebagai satu pesanan dan buka WhatsApp.
 * Alamat diisi saat checkout. Pengunjung yang belum masuk diarahkan ke login lewat `onLogin`.
 */
export function Checkout({ onLogin }: { onLogin: () => void }) {
  const { status } = useSession();
  const { cart, updateCart } = useSite();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [placed, setPlaced] = useState<{ code: string; whatsapp: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const subtotal = cart.some((item) => item.price === null)
    ? null
    : cart.reduce((sum, item) => sum + item.price! * item.quantity, 0);

  const setQuantity = (id: number, quantity: number) =>
    updateCart((items) => items.map((item) => (item.id === id ? { ...item, quantity } : item)));
  const remove = (id: number) => updateCart((items) => items.filter((item) => item.id !== id));

  const submit = () => {
    if (status !== "authenticated") return onLogin();
    setError("");
    startTransition(async () => {
      const result = await placeOrder({
        items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        notes,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setPlaced(result);
      updateCart(() => []);
      window.location.assign(result.whatsapp);
    });
  };

  if (placed)
    return (
      <div role="status" className="flex flex-col items-center pt-4 pb-9 text-center">
        <CheckCircleIcon size={44} weight="light" className="text-accent" aria-hidden="true" />
        <p className="mt-4 text-sm text-muted">Pesanan tercatat</p>
        <p className="mt-1 font-heading text-[28px] font-bold tracking-[-.04em]">{placed.code}</p>
        <p className="mt-4 max-w-sm text-[15px] text-muted">
          WhatsApp sedang dibuka. Kirim pesan yang sudah terisi tanpa menghapus atau mengubahnya. Setelah harga
          disepakati, Sak Karepe mengirim link checkout untuk mengisi alamat dan membayar.
        </p>
        <a className="btn mt-7 gap-3" href={placed.whatsapp} target="_blank" rel="noopener noreferrer">
          Buka WhatsApp <LinkIcon />
        </a>
        <Link href={`/pesanan/${placed.code}`} className="mt-4 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          Lihat di Pesanan saya
        </Link>
      </div>
    );

  if (cart.length === 0)
    return (
      <div className="flex flex-col items-center pt-4 pb-9 text-center">
        <p className="text-[15px] text-muted">Keranjang masih kosong.</p>
        <Link href="/koleksi" className="btn mt-6">
          Lihat koleksi
        </Link>
      </div>
    );

  return (
    <>
      <ul className="space-y-5">
        {cart.map((item) => (
          <li key={item.id} className="flex gap-4">
            <div className="photo size-18 shrink-0">
              <Image className="object-cover" src={item.image.src} alt={item.image.alt} fill sizes="72px" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-[15px] leading-snug font-medium">{item.name}</p>
                <button
                  className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors hover:text-ink"
                  aria-label={`Hapus ${item.name}`}
                  onClick={() => remove(item.id)}
                >
                  <TrashIcon size={16} aria-hidden="true" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-sm text-muted">
                  {item.price === null ? "Harga melalui konsultasi" : formatRupiah(item.price)}
                </p>
                <div className="flex h-9 shrink-0 items-center rounded-full border border-line" role="group" aria-label={`Jumlah ${item.name}`}>
                  <button
                    className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:text-ink disabled:opacity-35"
                    aria-label="Kurangi jumlah"
                    disabled={item.quantity <= 1}
                    onClick={() => setQuantity(item.id, item.quantity - 1)}
                  >
                    <MinusIcon size={14} aria-hidden="true" />
                  </button>
                  <output className="w-6 text-center text-[15px] tabular-nums" aria-live="polite">
                    {item.quantity}
                  </output>
                  <button
                    className="grid size-9 place-items-center rounded-full text-muted transition-colors hover:text-ink disabled:opacity-35"
                    aria-label="Tambah jumlah"
                    disabled={item.quantity >= maxQuantity(item)}
                    onClick={() => setQuantity(item.id, item.quantity + 1)}
                  >
                    <PlusIcon size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <details className="group mt-8" open={notes.length > 0}>
        <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
          <PlusIcon size={14} className="transition-transform group-open:rotate-45" aria-hidden="true" />
          Catatan untuk penjual
        </summary>
        <textarea
          aria-label="Catatan untuk penjual"
          className="mt-3 block min-h-20 w-full rounded-md border border-line bg-transparent p-3 text-[15px] placeholder:text-muted focus:border-accent focus:outline-none"
          placeholder="Mis. ukuran, warna, atau motif yang diinginkan"
          maxLength={500}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </details>
      <div className={`sticky bottom-0 mt-8 border-t border-line bg-page pt-4 pb-5 ${bleed}`}>
        {error && (
          <p role="alert" className="mb-3 text-sm text-ink">
            {error}
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">Subtotal</p>
            <p className="text-lg leading-tight font-medium tabular-nums">
              {subtotal === null ? "Dikonfirmasi penjual" : formatRupiah(subtotal)}
            </p>
          </div>
          <button className="btn gap-3 px-5" disabled={pending || status === "loading"} onClick={submit}>
            {pending ? "Mencatat…" : status === "authenticated" ? "Pesan via WhatsApp" : "Masuk untuk memesan"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Harga disepakati di WhatsApp. Alamat dan ongkos kirim diisi saat checkout.</p>
      </div>
    </>
  );
}

/**
 * Pilih alamat tersimpan atau isi alamat baru. Alamat pertama yang dimuat atau baru disimpan langsung terpilih.
 */
export function AddressPicker({ selected, onSelect }: { selected: number | null; onSelect: (id: number | null) => void }) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    listAddresses().then((list) => {
      if (!active) return;
      setAddresses(list);
      onSelect(list[0]?.id ?? null);
    });
    return () => {
      active = false;
    };
    // Hanya dimuat sekali saat komponen tampil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showForm = addresses !== null && (adding || addresses.length === 0);
  return (
    <section aria-labelledby="address-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="address-title" className="text-[24px] tracking-[-.03em]">
          {showForm ? "Alamat baru" : "Kirim ke"}
        </h2>
        {addresses !== null && !showForm && (
          <button className="text-sm text-accent hover:underline" onClick={() => setAdding(true)}>
            Tambah alamat
          </button>
        )}
      </div>
      {addresses === null ? (
        <div className="mt-3 h-20 animate-pulse rounded-md bg-surface" aria-label="Memuat alamat" />
      ) : showForm ? (
        <AddressForm
          onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
          onSaved={(address) => {
            setAddresses([address, ...addresses]);
            onSelect(address.id);
            setAdding(false);
          }}
        />
      ) : (
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">Pilih alamat</legend>
          {addresses.map((address) => (
            <label
              key={address.id}
              className="flex cursor-pointer gap-3 rounded-md border border-line px-4 py-3.5 transition-colors hover:border-muted has-checked:border-accent has-checked:bg-surface/60"
            >
              <input
                type="radio"
                name="address"
                className="mt-1 size-4 shrink-0 accent-(--accent)"
                checked={selected === address.id}
                onChange={() => onSelect(address.id)}
              />
              <span className="min-w-0 text-[15px] leading-snug">
                <span className="font-medium">{address.recipientName}</span>
                <span className="text-muted"> · {address.phone}</span>
                <span className="mt-1 block text-sm text-muted">
                  {formatAddress(address)} {address.postalCode}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </section>
  );
}

const regionCache = new Map<string, Promise<RegionOption[]>>();

/** Daftar wilayah di bawah `parent` ("" untuk provinsi), disimpan selama halaman terbuka. */
function loadRegions(parent: string) {
  let request = regionCache.get(parent);
  if (!request) {
    request = fetch(`${basePath}/api/regions${parent ? `?parent=${parent}` : ""}`).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<RegionOption[]>;
    });
    request.catch(() => regionCache.delete(parent));
    regionCache.set(parent, request);
  }
  return request;
}

/** null selama memuat atau bila `parent` belum dipilih; `failed` bila permintaan gagal. */
function useRegions(parent: string | null) {
  const [state, setState] = useState<{ parent: string; options: RegionOption[]; failed?: boolean } | null>(null);
  useEffect(() => {
    if (parent === null) return;
    let active = true;
    loadRegions(parent).then(
      (options) => active && setState({ parent, options }),
      () => active && setState({ parent, options: [], failed: true }),
    );
    return () => {
      active = false;
    };
  }, [parent]);
  return parent !== null && state?.parent === parent ? state : null;
}

function RegionSelect({
  id,
  name,
  title,
  parent,
  waiting,
  value,
  onChange,
}: {
  id: string;
  name?: string;
  title: string;
  /** Kode induk; null bila tingkat di atasnya belum dipilih. */
  parent: string | null;
  waiting: string;
  value: string;
  onChange: (option: RegionOption | undefined) => void;
}) {
  const regions = useRegions(parent);
  const placeholder =
    parent === null ? waiting : !regions ? "Memuat…" : regions.failed ? "Gagal memuat, pilih ulang di atas" : `Pilih ${title.toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className={label}>
        {title}
      </label>
      <div className="relative">
        <select
          id={id}
          name={name}
          required
          disabled={!regions?.options.length}
          className={`${field} appearance-none truncate pr-9`}
          value={value}
          onChange={(event) => onChange(regions?.options.find((option) => option.code === event.target.value))}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {regions?.options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        <CaretDownIcon
          size={14}
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

function AddressForm({ onSaved, onCancel }: { onSaved: (address: Address) => void; onCancel?: () => void }) {
  const [state, formAction, pending] = useActionState(async (previous: AddressFormState, formData: FormData) => {
    const result = await saveAddress(previous, formData);
    if (result.address) onSaved(result.address);
    return result;
  }, {});
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [postalCode, setPostalCode] = useState("");

  return (
    <form action={formAction} className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2">
      {!onCancel && (
        <p className="-mt-1 text-sm text-muted sm:col-span-2">Isi sekali, alamat tersimpan untuk pesanan berikutnya.</p>
      )}
      <div>
        <label htmlFor="recipientName" className={label}>Nama penerima</label>
        <input id="recipientName" name="recipientName" required autoComplete="name" className={field} />
      </div>
      <div>
        <label htmlFor="phone" className={label}>Nomor HP</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          className={field}
        />
      </div>
      <RegionSelect
        id="province"
        title="Provinsi"
        parent=""
        waiting=""
        value={province}
        onChange={(option) => {
          setProvince(option?.code ?? "");
          setCity("");
          setDistrict("");
          setVillage("");
          setPostalCode("");
        }}
      />
      <RegionSelect
        id="city"
        title="Kota/kabupaten"
        parent={province || null}
        waiting="Pilih provinsi dulu"
        value={city}
        onChange={(option) => {
          setCity(option?.code ?? "");
          setDistrict("");
          setVillage("");
          setPostalCode("");
        }}
      />
      <RegionSelect
        id="district"
        title="Kecamatan"
        parent={city || null}
        waiting="Pilih kota dulu"
        value={district}
        onChange={(option) => {
          setDistrict(option?.code ?? "");
          setVillage("");
          setPostalCode("");
        }}
      />
      <RegionSelect
        id="village"
        name="villageCode"
        title="Kelurahan/desa"
        parent={district || null}
        waiting="Pilih kecamatan dulu"
        value={village}
        onChange={(option) => {
          setVillage(option?.code ?? "");
          setPostalCode(option?.postalCode ?? "");
        }}
      />
      <div className="sm:col-span-2">
        <label htmlFor="street" className={label}>Alamat jalan</label>
        <textarea
          id="street"
          name="street"
          required
          rows={2}
          autoComplete="address-line1"
          placeholder="Nama jalan, nomor rumah, RT/RW"
          className="block w-full rounded-md border border-line bg-transparent px-3 py-2.5 text-[15px] placeholder:text-muted focus:border-accent focus:outline-none"
        />
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
          placeholder="Terisi dari kelurahan"
          className={`${field} tabular-nums`}
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, ""))}
        />
      </div>
      <div>
        <label htmlFor="notes" className={label}>
          Patokan <span className="font-normal">(opsional)</span>
        </label>
        <input id="notes" name="notes" placeholder="Mis. pagar hijau" className={field} />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-ink sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-5 pt-1 sm:col-span-2">
        <button className="btn gap-3 px-5" disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan alamat"}
        </button>
        {onCancel && (
          <button type="button" className="text-sm text-muted hover:text-ink" onClick={onCancel}>
            Batal
          </button>
        )}
      </div>
    </form>
  );
}
