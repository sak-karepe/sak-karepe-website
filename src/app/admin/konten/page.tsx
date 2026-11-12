import type { Metadata } from "next";
import { requireAdminPage } from "@/auth";
import { ContentForm } from "@/components/content-form";
import { blockSections, getBlocks } from "@/lib/page-blocks";

export const metadata: Metadata = { title: "Konten" };

export default async function AdminContentPage() {
  await requireAdminPage();
  const blocks = await getBlocks();

  return (
    <main id="utama" className="w-full max-w-full overflow-x-clip px-5 pt-8 md:px-10 md:pt-12">
      <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Kelola konten</h1>
      <p className="mt-2 text-muted">Perbarui teks dan gambar utama halaman Beranda dan Cerita tanpa deploy ulang.</p>
      <ContentForm sections={blockSections} values={blocks} />
    </main>
  );
}
