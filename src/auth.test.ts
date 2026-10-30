import assert from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

// Database sementara harus diset sebelum @/db dimuat.
process.env.DATABASE_URL = `file:${join(mkdtempSync(join(tmpdir(), "auth-test-")), "test.db")}`;
process.env.ADMIN_EMAILS = "Root@Example.com, owner@example.com";

test("isAdmin: admin utama dari env, admin lain dari users.role", async () => {
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const { isAdmin } = await import("@/auth");
  await migrate(db, { migrationsFolder: "drizzle" });

  const [buyer, staff, root] = await db
    .insert(users)
    .values([{ email: "buyer@example.com" }, { email: "staff@example.com", role: "admin" }, { email: "root@example.com" }])
    .returning({ id: users.id, email: users.email });

  assert.equal(await isAdmin({ id: String(buyer.id), email: buyer.email }), false);
  assert.equal(await isAdmin({ id: String(staff.id), email: staff.email }), true);
  // Role root tetap "pembeli" di database, tapi env membuatnya admin.
  assert.equal(await isAdmin({ id: String(root.id), email: root.email }), true);

  process.env.ADMIN_EMAILS = "owner@example.com";
  assert.equal(await isAdmin({ id: String(root.id), email: root.email }), false, "dihapus dari env = dicabut");
});
