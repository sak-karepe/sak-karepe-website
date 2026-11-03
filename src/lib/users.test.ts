import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

// Database sementara; env harus diisi sebelum @/db dimuat.
const dir = mkdtempSync(join(tmpdir(), "sk-users-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
after(() => rmSync(dir, { recursive: true, force: true }));

test("tidak pernah tanpa admin, dan email baru langsung admin", async () => {
  const { eq } = await import("drizzle-orm");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { grantAdmin, revokeAdmin } = await import("@/lib/users");
  await migrate(db, { migrationsFolder: "drizzle" });

  const roleOf = async (email: string) => (await db.query.users.findFirst({ where: eq(users.email, email) }))?.role;
  const idOf = async (email: string) => (await db.query.users.findFirst({ where: eq(users.email, email) }))!.id;

  await db.insert(users).values({ email: "a@x.id", role: "admin" });
  await grantAdmin("B@x.id"); // belum pernah login
  assert.strictEqual(await roleOf("b@x.id"), "admin");
  const [a, b] = [await idOf("a@x.id"), await idOf("b@x.id")];

  assert.strictEqual(await revokeAdmin(a, { id: a, root: false }), false, "tidak bisa mencabut diri sendiri");
  assert.strictEqual(await revokeAdmin(b, { id: a, root: false }), true);
  // B yang baru dicabut tidak bisa lagi mencabut A (dua admin saling mencabut bersamaan).
  assert.strictEqual(await revokeAdmin(a, { id: b, root: false }), false);
  assert.strictEqual(await roleOf("a@x.id"), "admin");
  // Admin bawaan tidak butuh role admin di database.
  assert.strictEqual(await revokeAdmin(a, { id: b, root: true }), true);

  // Upsert ulang tidak membuat baris ganda.
  await grantAdmin("a@x.id");
  assert.strictEqual((await db.query.users.findMany()).length, 2);
  assert.strictEqual(await roleOf("a@x.id"), "admin");
});
