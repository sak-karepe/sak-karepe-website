import { db } from "@/db";
import { pageBlocks } from "@/db/schema";
import { requireAdmin } from "@/auth";
import { blockFields, blockSections, getBlocks } from "@/lib/page-blocks";
import { checkUpload, removeUpload, saveUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

const inputClass =
  "w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink";

async function saveBlocks(formData: FormData) {
  "use server";
  await requireAdmin();

  // Cek semua file dulu, supaya tidak ada yang tersimpan setengah jalan.
  const uploads: { key: string; file: File }[] = [];
  for (const { key, kind } of blockFields) {
    const file = formData.get(key);
    if (kind !== "image" || !(file instanceof File) || file.size === 0) continue;
    const uploadError = checkUpload(file);
    if (uploadError) redirect(`/admin/konten?error=${encodeURIComponent(uploadError)}`);
    uploads.push({ key, file });
  }

  const current = await getBlocks();
  const values: { key: string; value: string }[] = [];
  for (const { key, kind } of blockFields) {
    const value = formData.get(key);
    if (kind !== "image" && typeof value === "string") values.push({ key, value: value.trim() });
  }
  for (const { key, file } of uploads) values.push({ key, value: await saveUpload(file) });

  for (const { key, value } of values) {
    await db
      .insert(pageBlocks)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: pageBlocks.key, set: { value, updatedAt: new Date() } });
  }
  // Foto lama baru dihapus setelah penggantinya tersimpan; foto bawaan di public/ tidak ikut terhapus.
  for (const { key } of uploads) await removeUpload(current[key]);

  revalidatePath("/");
  revalidatePath("/cerita");
  redirect("/admin/konten?success=1");
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;
  const blocks = await getBlocks();

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Kelola konten</h1>
      <p className="mt-2 text-muted">Perbarui teks dan gambar utama halaman Beranda dan Cerita tanpa deploy ulang.</p>

      {success === "1" && !error && (
        <p role="status" className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          <CheckCircleIcon size={20} className="shrink-0 text-accent" aria-hidden="true" />
          Perubahan tersimpan dan halaman publik sudah diperbarui.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          <WarningCircleIcon size={20} className="shrink-0 text-danger" aria-hidden="true" />
          Tidak ada yang disimpan. {error}
        </p>
      )}

      <form action={saveBlocks} className="mt-8 space-y-8 pb-20">
        <div className="grid items-start gap-8 lg:grid-cols-2">
          {blockSections.map((section) => (
            <section key={section.title} className="space-y-5 rounded-xl border border-line bg-surface p-6 md:p-8">
              <div className="border-b border-line pb-4">
                <h2 className="text-xl font-medium tracking-tight">{section.title}</h2>
                <p className="mt-1 text-sm text-muted">{section.description}</p>
              </div>
              {section.fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="mb-2 block text-sm font-medium">{field.label}</span>
                  {field.kind === "text" && (
                    <input type="text" name={field.key} defaultValue={blocks[field.key]} className={inputClass} />
                  )}
                  {field.kind === "textarea" && (
                    <textarea name={field.key} defaultValue={blocks[field.key]} rows={3} className={inputClass} />
                  )}
                  {field.kind === "image" && (
                    <>
                      <input
                        type="file"
                        name={field.key}
                        accept="image/jpeg,image/png,image/webp"
                        className="w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-page hover:file:opacity-90"
                      />
                      <span className="mt-2 block truncate text-xs text-muted">
                        Aktif: <span className="text-ink">{blocks[field.key]}</span> (kosongkan untuk tetap memakai foto ini)
                      </span>
                    </>
                  )}
                </label>
              ))}
            </section>
          ))}
        </div>
        <div className="flex justify-end border-t border-line pt-6">
          <button type="submit" className="btn min-h-11 px-6 text-[15px]">
            Simpan perubahan
          </button>
        </div>
      </form>
    </main>
  );
}
