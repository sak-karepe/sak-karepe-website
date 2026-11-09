"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { WarningCircleIcon } from "@phosphor-icons/react";
import { CloseIcon } from "@/components/icons";
import type { UpdateAddressFormState } from "@/lib/order-actions";

type Address = {
  recipientName: string;
  phone: string;
  shippingAddress: string;
  postalCode: string;
};

type Props = {
  action: (state: UpdateAddressFormState, formData: FormData) => Promise<UpdateAddressFormState>;
  address: Address;
};

const inputClass =
  "mt-1 w-full rounded-md border border-line bg-page px-3 py-2.5 text-[15px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function EditAddressDialog({ action, address }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [session, setSession] = useState(0);

  const open = () => {
    setSession((val) => val + 1);
    dialog.current?.showModal();
  };

  const close = () => {
    dialog.current?.close();
  };

  return (
    <>
      <button
        type="button"
        className="text-sm font-medium text-accent hover:underline"
        onClick={open}
      >
        Ubah alamat
      </button>
      <dialog
        ref={dialog}
        className="checkout-dialog"
        aria-labelledby="edit-address-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-surface px-5 py-4 md:px-7">
          <h2 id="edit-address-title" className="text-[22px] tracking-[-.03em]">
            Ubah alamat pengiriman
          </h2>
          <button
            type="button"
            className="square -mr-2 size-10 text-muted"
            aria-label="Tutup dialog"
            onClick={close}
          >
            <CloseIcon />
          </button>
        </div>
        {session > 0 && <EditAddressForm key={session} action={action} address={address} onClose={close} />}
      </dialog>
    </>
  );
}

function EditAddressForm({
  action,
  address,
  onClose,
}: Props & { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.saved) {
      onClose();
    }
  }, [state.saved, onClose]);

  return (
    <form action={formAction} className="grid gap-4 p-5 md:p-7">
      <label className="text-sm font-medium">
        Nama penerima
        <input
          name="recipientName"
          defaultValue={address.recipientName}
          required
          autoComplete="name"
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        Nomor HP
        <input
          name="phone"
          type="tel"
          defaultValue={address.phone}
          required
          autoComplete="tel"
          pattern="0\d{8,13}"
          placeholder="08xxxxxxxxxx"
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        Alamat lengkap
        <textarea
          name="shippingAddress"
          defaultValue={address.shippingAddress}
          required
          rows={3}
          autoComplete="street-address"
          className={inputClass}
        />
      </label>
      <label className="text-sm font-medium">
        Kode pos
        <input
          name="postalCode"
          defaultValue={address.postalCode}
          required
          pattern="\d{5}"
          maxLength={5}
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="5 digit angka"
          className={inputClass}
        />
      </label>
      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-danger">
          <WarningCircleIcon size={18} weight="bold" aria-hidden="true" className="shrink-0" />
          <span>{state.error}</span>
        </p>
      )}
      <div className="mt-2 flex items-center justify-end gap-3 border-t border-line pt-4">
        <button
          type="button"
          className="min-h-11 rounded-md border border-line px-4 text-[15px] transition-colors hover:bg-surface"
          disabled={pending}
          onClick={onClose}
        >
          Batal
        </button>
        <button
          type="submit"
          className="btn min-h-11 px-5 text-[15px]"
          disabled={pending}
        >
          {pending ? "Menyimpan…" : "Simpan alamat"}
        </button>
      </div>
    </form>
  );
}
