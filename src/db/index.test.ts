import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

// Database sementara; env harus diisi sebelum @/db dimuat.
const dir = mkdtempSync(join(tmpdir(), "sk-db-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
after(() => rmSync(dir, { recursive: true, force: true }));

test("transaksi bersamaan tidak gagal SQLITE_BUSY", async () => {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  const { completeDeliveredOrders } = await import("@/lib/shipments");
  const { cancelExpiredOrders } = await import("@/lib/payments");
  await migrate(db, { migrationsFolder: "drizzle" });

  // Sama seperti job otomatis di instrumentation-node.ts saat server start, plus satu transaksi gagal di tengah antrean.
  const results = await Promise.allSettled([
    completeDeliveredOrders(),
    db.transaction(async () => {
      await new Promise((r) => setTimeout(r, 50));
      throw new Error("gagal");
    }),
    cancelExpiredOrders(),
    completeDeliveredOrders(),
  ]);
  assert.deepStrictEqual(
    results.map((r) => (r.status === "fulfilled" ? "ok" : (r.reason as Error).message)),
    ["ok", "gagal", "ok", "ok"],
  );
});

test("ganti slug koleksi ikut memindahkan produknya, slug bentrok diberi akhiran", async () => {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const { categories, products } = await import("@/db/schema");
  const { uniqueSlug } = await import("@/lib/slug");
  await migrate(db, { migrationsFolder: "drizzle" });

  const base = { subtitle: "s", description: "d", intro: "i", character: "c", coverImage: "/x.jpg" };
  await db.insert(categories).values([
    { ...base, slug: "uji-lama", title: "Lama" },
    { ...base, slug: "uji-baru", title: "Baru" },
  ]);
  const [product] = await db
    .insert(products)
    .values({ categorySlug: "uji-lama", name: "P", slug: "uji-produk" })
    .returning();

  assert.strictEqual(await uniqueSlug(categories.slug, "Uji Baru"), "uji-baru-2");
  await db.update(categories).set({ slug: "uji-ganti" }).where(eq(categories.slug, "uji-lama"));
  const moved = await db.query.products.findFirst({ where: eq(products.id, product.id) });
  assert.strictEqual(moved?.categorySlug, "uji-ganti");
});
