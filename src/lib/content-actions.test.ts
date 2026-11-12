import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, mock, test } from "node:test";

// Database dan folder upload sementara; env harus diisi sebelum @/db dan lib/uploads dimuat.
const dir = mkdtempSync(join(tmpdir(), "sk-content-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
process.env.UPLOAD_DIR = join(dir, "uploads");
after(() => rmSync(dir, { recursive: true, force: true }));
mock.module("@/auth", { namedExports: { requireAdmin: async () => ({ id: "1" }) } });
mock.module("next/cache", { namedExports: { revalidatePath: () => {} } });

test("simpan konten: teks bawaan disimpan kosong, alt bisa diubah, foto bisa dikembalikan ke bawaan", async () => {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  const { saveBlocks } = await import("@/lib/content-actions");
  const { blockFields, getBlocks } = await import("@/lib/page-blocks");
  await migrate(db, { migrationsFolder: "drizzle" });
  const fallback = (key: string) => blockFields.find((field) => field.key === key)!.fallback;

  const form = new FormData();
  form.set("home_hero_title_1", fallback("home_hero_title_1"));
  form.set("home_hero_title_2", "  Judul baru  ");
  form.set("home_hero_image_alt", "Foto baru");
  form.set("home_hero_image", new File([new Uint8Array([0xff, 0xd8, 0xff])], "hero.jpg", { type: "image/jpeg" }));
  assert.deepStrictEqual(await saveBlocks({}, form), { saved: true });

  let blocks = await getBlocks();
  assert.strictEqual(blocks.home_hero_title_1, fallback("home_hero_title_1"));
  assert.strictEqual(blocks.home_hero_title_2, "Judul baru");
  assert.strictEqual(blocks.home_hero_image_alt, "Foto baru");
  assert.match(blocks.home_hero_image, /^\/uploads\//);

  const reset = new FormData();
  reset.set("home_hero_image__reset", "1");
  assert.deepStrictEqual(await saveBlocks({}, reset), { saved: true });
  blocks = await getBlocks();
  assert.strictEqual(blocks.home_hero_image, fallback("home_hero_image"));
  assert.strictEqual(blocks.home_hero_title_2, "Judul baru", "kolom yang tidak dikirim tidak berubah");

  const bad = new FormData();
  bad.set("home_hero_title_2", "Tidak tersimpan");
  bad.set("story_hero_img", new File(["x"], "a.gif", { type: "image/gif" }));
  assert.match((await saveBlocks({}, bad)).error ?? "", /Gambar hero/);
  assert.strictEqual((await getBlocks()).home_hero_title_2, "Judul baru");
});
