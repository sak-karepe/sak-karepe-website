"use client";
import { useEffect, useState, useTransition } from "react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { AddressPicker } from "@/components/checkout";
import { checkoutOrder, quoteOrderShipping, type ShippingQuoteResult } from "@/lib/checkout-actions";
import { formatRupiah } from "@/lib/format";

/** Bagian interaktif halaman checkout: pilih alamat dan kurir, lalu buat link DOKU dan pindah ke halaman bayar. */
export function OrderCheckout({ orderId, subtotal }: { orderId: number; subtotal: number }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [quote, setQuote] = useState<{ addressId: number; result: ShippingQuoteResult } | null>(null);
  /** "kurir:layanan", mis. "jnt:ez". */
  const [service, setService] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!selected) return;
    let active = true;
    quoteOrderShipping(orderId, selected)
      // Tanpa ini kerangka ongkir terus berputar bila server action gagal (mis. koneksi putus).
      .catch((): ShippingQuoteResult => ({ error: "Ongkos kirim belum bisa dihitung. Coba lagi sebentar." }))
      .then((result) => {
        if (!active) return;
        setQuote({ addressId: selected, result });
        // Layanan termurah terpilih lebih dulu.
        setService("options" in result ? `${result.options[0].courierCode}:${result.options[0].serviceCode}` : "");
      });
    return () => {
      active = false;
    };
  }, [orderId, selected]);

  // Pilihan kurir alamat sebelumnya tidak dipakai selama alamat baru masih dihitung.
  const result = selected && quote?.addressId === selected ? quote.result : null;
  const options = result && "options" in result ? result.options : [];
  const option = options.find((option) => `${option.courierCode}:${option.serviceCode}` === service);
  const submit = () => {
    if (!selected || !option) return;
    setError("");
    startTransition(async () => {
      const response = await checkoutOrder(orderId, selected, { courierCode: option.courierCode, serviceCode: option.serviceCode });
      if ("error" in response) setError(response.error);
      else window.location.assign(response.url);
    });
  };

  return (
    <>
      <AddressPicker selected={selected} onSelect={setSelected} />
      <section aria-labelledby="kurir" className="mt-10">
        <h2 id="kurir" className="text-[24px] tracking-[-.03em]">Kurir</h2>
        {!selected ? (
          <p className="mt-3 text-[15px] text-muted">Pilih alamat dulu untuk melihat ongkos kirim.</p>
        ) : !result ? (
          <div className="mt-3 h-32 animate-pulse rounded-md bg-surface" aria-label="Menghitung ongkos kirim" />
        ) : "error" in result ? (
          <p role="alert" className="mt-3 text-[15px] text-danger">
            {result.error}
          </p>
        ) : (
          <fieldset className="mt-3 space-y-2">
            <legend className="sr-only">Pilih layanan kurir</legend>
            {options.map((option) => {
              const value = `${option.courierCode}:${option.serviceCode}`;
              return (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-3.5 transition-colors hover:border-muted has-checked:border-accent has-checked:bg-surface/60"
                >
                  <input
                    type="radio"
                    name="courier"
                    className="size-4 shrink-0 accent-(--accent)"
                    checked={service === value}
                    onChange={() => setService(value)}
                  />
                  <span className="min-w-0 flex-1 text-[15px] leading-snug">
                    <span className="font-medium">{option.name}</span>
                    {option.duration && <span className="block text-sm text-muted">Estimasi {option.duration}</span>}
                  </span>
                  <span className="shrink-0 text-[15px] tabular-nums">{formatRupiah(option.price)}</span>
                </label>
              );
            })}
          </fieldset>
        )}
      </section>
      <section aria-labelledby="ringkasan" className="mt-10 border-t border-line pt-6">
        <h2 id="ringkasan" className="sr-only">Ringkasan pembayaran</h2>
        <p className="flex justify-between gap-4">
          Subtotal <span className="tabular-nums">{formatRupiah(subtotal)}</span>
        </p>
        <p className="mt-1 flex justify-between gap-4 text-muted">
          Ongkos kirim <span className="tabular-nums">{option ? formatRupiah(option.price) : "—"}</span>
        </p>
        <p className="mt-3 flex justify-between gap-4 border-t border-line pt-3 text-lg font-medium">
          Total <span className="tabular-nums">{option ? formatRupiah(subtotal + option.price) : "—"}</span>
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        )}
        <button className="btn mt-6 w-full gap-2" disabled={!option || pending} onClick={submit}>
          {pending ? "Membuat link pembayaran…" : "Lanjut ke pembayaran"} <ArrowSquareOutIcon size={18} aria-hidden="true" />
        </button>
        <p className="mt-2 text-xs text-muted">Ongkos kirim dari Biteship. Pembayaran diproses DOKU, link berlaku 24 jam.</p>
      </section>
    </>
  );
}
