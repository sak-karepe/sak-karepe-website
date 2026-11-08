import { db } from "@/db";
import { pageBlocks } from "@/db/schema";
import { saveUpload, checkUpload } from "@/lib/uploads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr";

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const isSuccess = params.success === "1";

  let blocksData: { key: string; value: string }[] = [];

  try {
    blocksData = await db.select().from(pageBlocks);
  } catch (err) {
    console.error("Tabel page_blocks belum tersedia:", err);
  }

  const blockMap = Object.fromEntries(
    blocksData.map(({ key, value }) => [key, value])
  );

  async function handleSave(formData: FormData) {
    "use server";

    async function saveBlock(key: string, value: string) {
      await db
        .insert(pageBlocks)
        .values({
          key,
          value,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: pageBlocks.key,
          set: {
            value,
            updatedAt: new Date(),
          },
        });
    }

    // Simpan konten teks
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("text_")) {
        const blockKey = key.replace("text_", "");
        await saveBlock(blockKey, value.toString());
      }
    }

    // Simpan gambar
    for (const [key, file] of formData.entries()) {
      if (
        key.startsWith("file_") &&
        file instanceof File &&
        file.size > 0
      ) {
        const blockKey = key.replace("file_", "");
        const uploadError = checkUpload(file);

        if (uploadError) {
          console.error(uploadError);
          continue;
        }

        const imageUrl = await saveUpload(file);
        await saveBlock(blockKey, imageUrl);
      }
    }

    // Perbarui halaman publik
    revalidatePath("/");
    revalidatePath("/cerita");

    // Redirect kembali ke halaman admin dengan penanda success=1
    redirect("/admin/konten?success=1");
  }

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      {/* Header Halaman */}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl tracking-[-.045em] md:text-4xl">Kelola Konten</h1>
          <p className="mt-2 text-muted">
            Perbarui teks dan gambar utama halaman Beranda & Cerita tanpa perlu deploy ulang.
          </p>
        </div>
      </div>

      {/* Banner Konfirmasi Sukses */}
      {isSuccess && (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink">
          <CheckCircleIcon size={20} className="text-accent shrink-0" aria-hidden="true" />
          <span>Perubahan konten berhasil disimpan dan halaman publik telah diperbarui.</span>
        </div>
      )}

      {/* Form Utama */}
      <form action={handleSave} className="mt-8 space-y-8 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* KOLOM 1: BERANDA */}
          <section className="rounded-xl border border-line bg-surface p-6 md:p-8 space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className="text-xl font-medium tracking-tight">Halaman Beranda</h2>
              <p className="mt-1 text-sm text-muted">Teks utama dan gambar hero pada halaman depan website.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Judul Hero (Baris 1)
                </label>
                <input
                  type="text"
                  name="text_home_hero_title_1"
                  defaultValue={blockMap["home_hero_title_1"] || "Ecoprint dari"}
                  className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Judul Hero (Baris 2)
                </label>
                <input
                  type="text"
                  name="text_home_hero_title_2"
                  defaultValue={blockMap["home_hero_title_2"] || "ruang belajar."}
                  className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Subjudul Hero
              </label>
              <textarea
                name="text_home_hero_subtitle"
                defaultValue={blockMap["home_hero_subtitle"] || ""}
                className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                rows={4}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Gambar Hero (Opsional)
              </label>
              <input
                type="file"
                name="file_home_hero_image"
                accept="image/jpeg,image/png,image/webp"
                className="w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-page hover:file:opacity-90"
              />
              {blockMap["home_hero_image"] && (
                <p className="mt-2 text-xs text-muted truncate">
                  File aktif: <span className="text-ink">{blockMap["home_hero_image"]}</span>
                </p>
              )}
            </div>
          </section>

          {/* KOLOM 2: CERITA */}
          <section className="rounded-xl border border-line bg-surface p-6 md:p-8 space-y-6">
            <div className="border-b border-line pb-4">
              <h2 className="text-xl font-medium tracking-tight">Halaman Cerita</h2>
              <p className="mt-1 text-sm text-muted">Narasi perjalanan dan bagian sejarah awal.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Judul Hero (Baris 1)
                </label>
                <input
                  type="text"
                  name="text_story_hero_title_1"
                  defaultValue={blockMap["story_hero_title_1"] || "Dari sekolah."}
                  className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Judul Hero (Baris 2)
                </label>
                <input
                  type="text"
                  name="text_story_hero_title_2"
                  defaultValue={blockMap["story_hero_title_2"] || "Menuju dunia."}
                  className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Subjudul Hero Cerita
              </label>
              <textarea
                name="text_story_hero_subtitle"
                defaultValue={blockMap["story_hero_subtitle"] || ""}
                className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                rows={4}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Gambar Hero Cerita (Opsional)
              </label>
              <input
                type="file"
                name="file_story_hero_img"
                accept="image/jpeg,image/png,image/webp"
                className="w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-page hover:file:opacity-90"
              />
              {blockMap["story_hero_img"] && (
                <p className="mt-2 text-xs text-muted truncate">
                  File aktif: <span className="text-ink">{blockMap["story_hero_img"]}</span>
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-line space-y-4">
              <h3 className="text-base font-medium">Bagian Awal (Timeline 2004)</h3>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Tahun</label>
                  <input
                    type="text"
                    name="text_story_2004_year"
                    defaultValue={blockMap["story_2004_year"] || "2004"}
                    className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium">Label Tahun</label>
                  <input
                    type="text"
                    name="text_story_2004_label"
                    defaultValue={blockMap["story_2004_label"] || "Awal pendidikan batik tulis"}
                    className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Judul Bagian</label>
                <input
                  type="text"
                  name="text_story_2004_title"
                  defaultValue={blockMap["story_2004_title"] || "Belajar dari warna alami."}
                  className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Paragraf 1</label>
                <textarea
                  name="text_story_2004_p1"
                  defaultValue={blockMap["story_2004_p1"] || ""}
                  className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                  rows={3}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Paragraf 2</label>
                <textarea
                  name="text_story_2004_p2"
                  defaultValue={blockMap["story_2004_p2"] || ""}
                  className="w-full rounded-md border border-line bg-page px-3.5 py-2.5 text-[15px] focus:outline-none focus:ring-1 focus:ring-ink"
                  rows={3}
                />
              </div>
            </div>
          </section>

        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-line">
          <button
            type="submit"
            className="btn min-h-11 px-6 text-[15px]"
          >
            Simpan Perubahan
          </button>
        </div>
      </form>
    </main>
  );
}