"use client";
import { useEffect, useState, useTransition } from "react";
import { ArrowSquareOutIcon, WarningCircleIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import { AddressPicker } from "@/components/checkout";
import {
  changePaidOrderAddress,
  payShippingDifference,
  quoteOrderShipping,
  type ShippingQuoteResult,
} from "@/lib/checkout-actions";
import { whatsappUrl } from "@/lib/contact";
import { formatRupiah } from "@/lib/format";

type Props = {
  orderId: number;
  orderCode: string;
  currentShippingCost: number;
};

export function ChangeOrderAddress({ orderId, orderCode, currentShippingCost }: Props) {
  const [editing, setEditing] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [quote, setQuote] = useState<{ addressId: number; result: ShippingQuoteResult } | null>(null);
  const [service, setService] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!selectedAddressId) return;
    let active = true;
    quoteOrderShipping(orderId, selectedAddressId)
      .catch((): ShippingQuoteResult => ({ error: "Ongkos kirim belum bisa dihitung. Coba lagi sebentar." }))
      .then((result) => {
        if (!active) return;
        setQuote({ addressId: selectedAddressId, result });
        if ("options" in result && result.options.length > 0) {
          setService(`${result.options[0].courierCode}:${result.options[0].serviceCode}`);
        } else {
          setService("");
        }
      });
    return () => {
      active = false;
    };
  }, [orderId, selectedAddressId]);

  if (!editing) {
    return (
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-line px-4 text-[14px] font-medium transition-colors hover:border-accent hover:text-accent"
        >
          Ubah alamat
        </button>
      </div>
    );
  }

  const result = selectedAddressId && quote?.addressId === selectedAddressId ? quote.result : null;
  const options = result && "options" in result ? result.options : [];
  const option = options.find((opt) => `${opt.courierCode}:${opt.serviceCode}` === service);
  const newCost = option?.price ?? 0;
  const diff = option ? newCost - currentShippingCost : 0;

  const handleSave = () => {
    if (!selectedAddressId || !option) return;
    setError("");
    startTransition(async () => {
      const res = await changePaidOrderAddress({
        orderId,
        addressId: selectedAddressId,
        courier: { courierCode: option.courierCode, serviceCode: option.serviceCode },
      });
      if (res.error) {
        setError(res.error);
      } else {
        setEditing(false);
      }
    });
  };

  const handlePayDiff = () => {
    if (!selectedAddressId || !option) return;
    setError("");
    startTransition(async () => {
      const res = await payShippingDifference({
        orderId,
        addressId: selectedAddressId,
        courier: { courierCode: option.courierCode, serviceCode: option.serviceCode },
      });
      if ("error" in res) {
        setError(res.error);
      } else {
        window.location.assign(res.url);
      }
    });
  };

  const waDiffMessage = whatsappUrl(
    `Halo Sak Karepe, saya ingin mengubah alamat pesanan ${orderCode}. Ongkos kirim baru terdapat selisih lebih tinggi sebesar ${formatRupiah(diff)}. Mohon bantuan konfirmasinya.`,
  );

  return (
    <div className="mt-6 rounded-md border border-line bg-surface/50 p-5">
      <div className="flex items-center justify-between pb-3 border-b border-line">
        <h3 className="text-base font-medium">Ubah alamat pengiriman</h3>
        <button
          type="button"
          className="text-sm text-muted hover:text-ink"
          onClick={() => setEditing(false)}
        >
          Tutup
        </button>
      </div>

      <div className="mt-4">
        <AddressPicker selected={selectedAddressId} onSelect={setSelectedAddressId} />
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium">Pilih Kurir</h4>
        {!selectedAddressId ? (
          <p className="mt-2 text-sm text-muted">Pilih alamat pengiriman di atas untuk melihat pilihan kurir.</p>
        ) : !result ? (
          <div className="mt-2 h-20 animate-pulse rounded-md bg-surface" aria-label="Menghitung ongkos kirim" />
        ) : "error" in result ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {result.error}
          </p>
        ) : (
          <fieldset className="mt-2 space-y-2">
            <legend className="sr-only">Pilih layanan kurir</legend>
            {options.map((opt) => {
              const val = `${opt.courierCode}:${opt.serviceCode}`;
              return (
                <label
                  key={val}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-3 transition-colors hover:border-muted has-checked:border-accent has-checked:bg-surface"
                >
                  <input
                    type="radio"
                    name="courierOption"
                    className="size-4 shrink-0 accent-(--accent)"
                    checked={service === val}
                    onChange={() => setService(val)}
                  />
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">
                    <span className="font-medium">{opt.name}</span>
                    {opt.duration && <span className="block text-xs text-muted">Estimasi {opt.duration}</span>}
                  </span>
                  <span className="shrink-0 text-[15px] tabular-nums">{formatRupiah(opt.price)}</span>
                </label>
              );
            })}
          </fieldset>
        )}
      </div>

      {option && (
        <div className="mt-6 rounded-md bg-page p-4 border border-line">
          <div className="flex justify-between text-sm">
            <span className="text-muted">Ongkir sebelumnya</span>
            <span className="tabular-nums">{formatRupiah(currentShippingCost)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-muted">Ongkir baru ({option.name})</span>
            <span className="tabular-nums font-medium">{formatRupiah(newCost)}</span>
          </div>

          <div className="mt-3 border-t border-line pt-3">
            {diff === 0 && (
              <p className="text-sm text-muted">Ongkos kirim tetap sama. Tidak ada biaya tambahan.</p>
            )}
            {diff < 0 && (
              <p className="text-sm text-accent">
                Ongkos kirim lebih hemat {formatRupiah(Math.abs(diff))}. Selisih akan dicatat untuk penanganan admin/refund.
              </p>
            )}
            {diff > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-danger font-medium">
                  Ongkos kirim ke alamat ini lebih tinggi sebesar {formatRupiah(diff)}.
                </p>
                <p className="text-xs text-muted">
                  Kamu bisa membayar selisihnya lewat DOKU atau hubungi admin via WhatsApp untuk konfirmasi penyesuaian.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-danger">
          <WarningCircleIcon size={18} weight="bold" aria-hidden="true" className="shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {option && diff <= 0 && (
          <button
            type="button"
            className="btn min-h-11 px-5 text-[15px]"
            disabled={pending}
            onClick={handleSave}
          >
            {pending ? "Menyimpan…" : "Simpan alamat baru"}
          </button>
        )}

        {option && diff > 0 && (
          <>
            <button
              type="button"
              className="btn min-h-11 gap-2 px-5 text-[15px]"
              disabled={pending}
              onClick={handlePayDiff}
            >
              {pending ? "Membuat link bayar…" : `Bayar selisih (${formatRupiah(diff)})`}{" "}
              <ArrowSquareOutIcon size={18} aria-hidden="true" />
            </button>
            <a
              href={waDiffMessage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-line px-4 text-[15px] transition-colors hover:border-accent hover:text-accent"
            >
              <WhatsappLogoIcon size={18} aria-hidden="true" /> Hubungi admin
            </a>
          </>
        )}

        <button
          type="button"
          className="min-h-11 rounded-md border border-line px-4 text-[15px] transition-colors hover:bg-surface"
          disabled={pending}
          onClick={() => setEditing(false)}
        >
          Batal
        </button>
      </div>
    </div>
  );
}
