"use client";

import { useActionState } from "react";
import { updateSettings } from "@/lib/settings-actions";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

type ContactData = {
  whatsapp: string;
  address: string;
  maps: string;
  instagramUrl: string;
  openingHours: string;
};

export function SettingsForm({ initialData }: { initialData: ContactData }) {
  // Menggunakan useActionState untuk menangkap return value dari server action secara reaktif
  const [state, formAction, pending] = useActionState(updateSettings, null);

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {/* Notifikasi Gagal / Error */}
      {state?.error && (
        <div className="flex items-start gap-3 rounded-md border border-danger/30 bg-danger/10 p-4 text-sm text-danger animate-in fade-in-50">
          <WarningCircleIcon size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Gagal memperbarui pengaturan</p>
            <p className="mt-0.5 text-xs opacity-90">{state.error}</p>
          </div>
        </div>
      )}

      {/* Notifikasi Berhasil */}
      {state?.success && (
        <div className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent/10 p-4 text-sm text-accent animate-in fade-in-50">
          <CheckCircleIcon size={20} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Berhasil!</p>
            <p className="mt-0.5 text-xs opacity-90">{state.success}</p>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">Nomor WhatsApp</label>
        <input
          type="text"
          name="whatsappNumber"
          defaultValue={initialData.whatsapp}
          placeholder="6281234567890"
          className="w-full rounded border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          required
        />
        <p className="mt-1 text-xs text-muted">
          Format wajib diawali dengan <strong>62</strong> (contoh: 6281234567890).
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Alamat Toko</label>
        <textarea
          name="address"
          rows={3}
          defaultValue={initialData.address}
          className="w-full rounded border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Link Google Maps / Embed</label>
        <input
          type="url"
          name="googleMapsLink"
          defaultValue={initialData.maps}
          className="w-full rounded border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Link Instagram</label>
        <input
          type="url"
          name="instagramUrl"
          defaultValue={initialData.instagramUrl}
          className="w-full rounded border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Jam Operasional / Buka</label>
        <input
          type="text"
          name="openingHours"
          defaultValue={initialData.openingHours}
          placeholder="Senin - Sabtu: 09:00 - 17:00 WIB"
          className="w-full rounded border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="btn min-h-11 px-6 text-[15px] disabled:opacity-50"
        >
          {pending ? "Menyimpan perubahan..." : "Simpan Pengaturan"}
        </button>
      </div>
    </form>
  );
}