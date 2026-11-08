"use client";
import Link from "next/link";
import { startTransition, useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { CheckCircleIcon, MinusIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useSession } from "next-auth/react";
import { LinkIcon } from "@/components/icons";
import { SearchableSelect } from "@/components/searchable-select";
import { useSite } from "@/components/site-shell";
import Image from "@/components/site-image";
import type { RegionOption } from "@/app/api/regions/route";
import type { Address } from "@/db/schema";
import { formatAddress } from "@/lib/address";
import { basePath } from "@/lib/assets";
import { deleteAddress, listAddresses, placeOrder, saveAddress, updateAddress, type AddressFormState, type PlaceOrderResult } from "@/lib/checkout-actions";
import { formatRupiah } from "@/lib/format";
import { normalizePhone, phoneError } from "@/lib/phone";

export type CheckoutProduct = {
  id: number;
  name: string;
  price: number | null;
  stock: number | null;
  image: { src: string; alt: string };
};

/** `stockLeft`: diisi saat server menolak pesanan karena stok kurang; menandai item dan hilang saat jumlahnya diubah. */
export type CartItem = CheckoutProduct & { quantity: number; stockLeft?: number };

/** Batas jumlah per produk: stok bila diisi, maksimal 99 (sama dengan validasi placeOrder). */
export const maxQuantity = (product: CheckoutProduct) => Math.min(product.stock ?? 99, 99);

const field =
  "h-11 w-full rounded-md border border-line bg-transparent px-3 text-[15px] text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none disabled:opacity-50";
const label = "mb-1.5 block text-[13px] font-medium text-muted";
const iconButton = "grid size-8 place-items-center rounded-full text-muted transition-colors hover:text-ink disabled:opacity-40";
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
    updateCart((items) => items.map((item) => (item.id === id ? { ...item, quantity, stockLeft: undefined } : item)));
  const remove = (id: number) => updateCart((items) => items.filter((item) => item.id !== id));
  const soldOut = cart.some((item) => item.stock === 0);

  const submit = () => {
    if (status !== "authenticated") return onLogin();
    setError("");
    startTransition(async () => {
      let result: PlaceOrderResult;
      try {
        result = await placeOrder({
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
          notes,
        });
      } catch {
        setError("Pesanan belum bisa dicatat. Periksa koneksi internet lalu coba lagi.");
        return;
      }
      if ("error" in result) {
        setError(result.error);
        // Stok di keranjang bisa usang: tandai item yang bermasalah dan turunkan batas jumlahnya ke sisa stok.
        const issues = result.stock;
        if (issues?.length)
          updateCart((items) =>
            items.map((item) => {
              const issue = issues.find((entry) => entry.productId === item.id);
              if (!issue) return item;
              return {
                ...item,
                stock: issue.available,
                quantity: issue.available > 0 ? Math.min(item.quantity, issue.available) : item.quantity,
                stockLeft: issue.available,
              };
            }),
          );
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
              {item.stockLeft !== undefined && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {item.stockLeft > 0
                    ? `Stok tersisa ${item.stockLeft}. Jumlah sudah disesuaikan.`
                    : "Stok habis. Hapus dari keranjang untuk melanjutkan."}
                </p>
              )}
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
      <div className={`sticky bottom-0 mt-8 bg-surface pt-4 pb-5 ${bleed}`}>
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
          <button className="btn gap-3 px-5" disabled={pending || status === "loading" || soldOut} onClick={submit}>
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
export function AddressPicker({
  selected,
  onSelect,
  onUpdated,
}: {
  selected: number | null;
  onSelect: (id: number | null) => void;
  /** Dipanggil setelah sebuah alamat diubah, mis. agar ongkir alamat yang sedang dipilih dihitung ulang. */
  onUpdated?: (id: number) => void;
}) {
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [adding, setAdding] = useState(false);
  /** Alamat yang sedang diubah (form tampil di tempat kartunya). */
  const [editing, setEditing] = useState<number | null>(null);
  /** Alamat yang menunggu konfirmasi hapus. */
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [deleting, startDelete] = useTransition();

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

  const remove = (id: number) => {
    setError("");
    startDelete(async () => {
      try {
        const result = await deleteAddress(id);
        if (result.error) return setError(result.error);
        // Updater, bukan `addresses` dari closure: alamat lain yang baru disimpan selama menghapus tidak tertimpa versi lama.
        setAddresses((list) => (list ?? []).filter((address) => address.id !== id));
        setConfirming(null);
        // Alamat yang dipilih dihapus: pindah ke alamat pertama yang tersisa (atau kosong). Id tidak berubah saat diedit.
        if (selected === id) onSelect(addresses?.find((address) => address.id !== id)?.id ?? null);
      } catch {
        setError("Alamat belum bisa dihapus. Periksa koneksi internet lalu coba lagi.");
      }
    });
  };

  const showForm = addresses !== null && (adding || addresses.length === 0);
  return (
    <section aria-labelledby="address-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="address-title" className="text-[24px] tracking-[-.03em]">
          {showForm ? "Alamat baru" : "Kirim ke"}
        </h2>
        {addresses !== null && !showForm && (
          <button
            className="text-sm text-accent hover:underline"
            onClick={() => {
              setAdding(true);
              setEditing(null);
              setConfirming(null);
              setError("");
            }}
          >
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
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          {addresses.map((address) =>
            editing === address.id ? (
              <div key={address.id} className="rounded-md border border-line p-4 md:p-5">
                <h3 className="text-[18px] font-medium tracking-[-.02em]">Ubah alamat</h3>
                <AddressForm
                  address={address}
                  onCancel={() => setEditing(null)}
                  onSaved={(saved) => {
                    setAddresses((list) => (list ?? []).map((item) => (item.id === saved.id ? saved : item)));
                    setEditing(null);
                    onUpdated?.(saved.id);
                  }}
                />
              </div>
            ) : (
              <div key={address.id}>
                <div className="relative">
                  <label className="flex cursor-pointer gap-3 rounded-md border border-line py-3.5 pr-20 pl-4 transition-colors hover:border-muted has-checked:border-accent has-checked:bg-surface/60">
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
                  <div className="absolute top-2.5 right-2.5 flex items-center">
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Ubah alamat ${address.recipientName}`}
                      onClick={() => {
                        setEditing(address.id);
                        setConfirming(null);
                        setError("");
                      }}
                    >
                      <PencilSimpleIcon size={17} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Hapus alamat ${address.recipientName}`}
                      onClick={() => {
                        setConfirming(address.id);
                        setError("");
                      }}
                    >
                      <TrashIcon size={17} aria-hidden="true" />
                    </button>
                  </div>
                </div>
                {confirming === address.id && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted">Hapus alamat ini? Pesanan yang sudah dibuat tidak terpengaruh.</span>
                    <button type="button" className="text-danger hover:underline disabled:opacity-50" disabled={deleting} onClick={() => remove(address.id)}>
                      {deleting ? "Menghapus…" : "Ya, hapus"}
                    </button>
                    <button type="button" className="text-muted hover:text-ink" disabled={deleting} onClick={() => setConfirming(null)}>
                      Batal
                    </button>
                  </p>
                )}
              </div>
            ),
          )}
        </fieldset>
      )}
    </section>
  );
}

const regionCache = new Map<string, Promise<RegionOption[]>>();

/** Hasil pencarian wilayah di bawah `parent` ("" untuk provinsi), disimpan selama halaman terbuka. */
function loadRegions(parent: string, query: string) {
  const key = new URLSearchParams({ parent, q: query.trim() }).toString();
  let request = regionCache.get(key);
  if (!request) {
    request = fetch(`${basePath}/api/regions?${key}`).then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<RegionOption[]>;
    });
    // Gagal tidak disimpan, jadi "Coba lagi" benar-benar meminta ulang.
    request.catch(() => regionCache.delete(key));
    regionCache.set(key, request);
  }
  return request;
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
  value: RegionOption | null;
  onChange: (option: RegionOption) => void;
}) {
  const load = useCallback((query: string) => loadRegions(parent ?? "", query), [parent]);
  return (
    <div>
      <label htmlFor={id} className={label}>
        {title}
      </label>
      <SearchableSelect
        id={id}
        name={name}
        required
        disabled={parent === null}
        placeholder={parent === null ? waiting : `Cari ${title.toLowerCase()}`}
        className={field}
        value={value}
        onChange={onChange}
        load={load}
      />
    </div>
  );
}

/** Form alamat baru; dengan `address` menjadi form ubah alamat (dipakai di daftar alamat checkout). */
function AddressForm({
  address,
  onSaved,
  onCancel,
}: {
  address?: Address;
  onSaved: (address: Address) => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(async (previous: AddressFormState, formData: FormData) => {
    const result = address ? await updateAddress(address.id, previous, formData) : await saveAddress(previous, formData);
    if (result.address) onSaved(result.address);
    return result;
  }, {});
  // Mode ubah: pilihan wilayah diisi dari kode kelurahan, "35.78.08.1001" -> 35, 35.78, 35.78.08, 35.78.08.1001.
  const parts = address?.villageCode?.split(".") ?? [];
  const codes = parts.length === 4 ? parts.map((_, index) => parts.slice(0, index + 1).join(".")) : [];
  // Semua isian dikontrol state: React 19 mengosongkan field uncontrolled setelah action selesai, termasuk saat server menolak.
  const [recipientName, setRecipientName] = useState(address?.recipientName ?? "");
  const [phone, setPhone] = useState(address?.phone ?? "");
  const [street, setStreet] = useState(address?.street ?? "");
  const [notes, setNotes] = useState(address?.notes ?? "");
  // Nama wilayah sudah disalin ke alamat, jadi pilihan awal tidak perlu dimuat ulang dari /api/regions.
  const initial = (index: number, label = "", postalCode: string | null = null): RegionOption | null =>
    address && codes[index] ? { value: codes[index], label, postalCode } : null;
  const [province, setProvince] = useState(initial(0, address?.province));
  const [city, setCity] = useState(initial(1, address?.city));
  const [district, setDistrict] = useState(initial(2, address?.district));
  const [village, setVillage] = useState(initial(3, address?.village, address?.postalCode));
  const [postalCode, setPostalCode] = useState(address?.postalCode ?? "");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null);
  // Aturan yang sama dengan server (lib/phone), jadi browser memblokir submit dan menampilkan pesan di field.
  const phoneInvalid = phone.trim() !== "" && normalizePhone(phone) === null;
  useEffect(() => {
    phoneRef.current?.setCustomValidity(phoneInvalid ? phoneError : "");
  }, [phoneInvalid]);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="mt-4 grid gap-x-4 gap-y-5 sm:grid-cols-2"
    >
      {!onCancel && !address && (
        <p className="-mt-1 text-sm text-muted sm:col-span-2">Isi sekali, alamat tersimpan untuk pesanan berikutnya.</p>
      )}
      {address && codes.length === 0 && (
        <p className="-mt-1 text-sm text-muted sm:col-span-2">
          Wilayah belum tersimpan di alamat ini. Pilih provinsi sampai kelurahan/desa untuk menyimpannya.
        </p>
      )}
      <div>
        <label htmlFor="recipientName" className={label}>Nama penerima</label>
        <input
          id="recipientName"
          name="recipientName"
          required
          autoComplete="name"
          className={field}
          value={recipientName}
          onChange={(event) => setRecipientName(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="phone" className={label}>Nomor HP</label>
        <input
          ref={phoneRef}
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          className={field}
          value={phone}
          aria-invalid={phoneTouched && phoneInvalid}
          aria-describedby={phoneTouched && phoneInvalid ? "phone-error" : undefined}
          onChange={(event) => setPhone(event.target.value)}
          onBlur={() => setPhoneTouched(true)}
          onInvalid={() => setPhoneTouched(true)}
        />
        {phoneTouched && phoneInvalid && (
          <p id="phone-error" role="alert" className="mt-1.5 text-sm text-danger">
            {phoneError}
          </p>
        )}
      </div>
      <RegionSelect
        id="province"
        title="Provinsi"
        parent=""
        waiting=""
        value={province}
        onChange={(option) => {
          setProvince(option);
          setCity(null);
          setDistrict(null);
          setVillage(null);
          setPostalCode("");
        }}
      />
      <RegionSelect
        id="city"
        title="Kota/kabupaten"
        parent={province?.value ?? null}
        waiting="Pilih provinsi dulu"
        value={city}
        onChange={(option) => {
          setCity(option);
          setDistrict(null);
          setVillage(null);
          setPostalCode("");
        }}
      />
      <RegionSelect
        id="district"
        title="Kecamatan"
        parent={city?.value ?? null}
        waiting="Pilih kota dulu"
        value={district}
        onChange={(option) => {
          setDistrict(option);
          setVillage(null);
          setPostalCode("");
        }}
      />
      <RegionSelect
        id="village"
        name="villageCode"
        title="Kelurahan/desa"
        parent={district?.value ?? null}
        waiting="Pilih kecamatan dulu"
        value={village}
        onChange={(option) => {
          setVillage(option);
          setPostalCode(option.postalCode ?? "");
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
          value={street}
          onChange={(event) => setStreet(event.target.value)}
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
        <input
          id="notes"
          name="notes"
          placeholder="Mis. pagar hijau"
          className={field}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-ink sm:col-span-2">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-5 pt-1 sm:col-span-2">
        <button className="btn gap-3 px-5" disabled={pending}>
          {pending ? "Menyimpan…" : address ? "Simpan perubahan" : "Simpan alamat"}
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