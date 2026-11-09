import type { Metadata } from "next";
import { requireAdminPage } from "@/auth";
import { getContactSettings } from "@/lib/contact-settings";
import { AdminBack } from "@/components/admin-back";
import { SettingsForm } from "@/components/settings-form";

export const metadata: Metadata = { title: "Pengaturan Kontak" };

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const contact = await getContactSettings();

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack />
      <h1 className="mt-4 mb-8 text-3xl tracking-[-.045em] md:text-4xl">
        Pengaturan Kontak
      </h1>
      <SettingsForm initialData={contact} />
    </main>
  );
}