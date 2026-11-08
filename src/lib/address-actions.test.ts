import assert from "node:assert";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, mock, test } from "node:test";

// Database sementara; env harus diisi sebelum @/db dimuat.
const dir = mkdtempSync(join(tmpdir(), "sk-address-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
after(() => rmSync(dir, { recursive: true, force: true }));

// Pembeli yang sedang masuk diganti lewat variabel ini (auth() butuh request Next).
let signedIn: number | null = null;
mock.module("@/auth", { namedExports: { currentUserId: async () => signedIn } });

test("ubah dan hapus alamat hanya untuk pemiliknya", async () => {
  const { eq } = await import("drizzle-orm");
  const { migrate } = await import("drizzle-orm/libsql/migrator");
  const { db } = await import("@/db");
  const { addresses, regions, users } = await import("@/db/schema");
  const { deleteAddress, saveAddress, updateAddress } = await import("@/lib/checkout-actions");
  await migrate(db, { migrationsFolder: "drizzle" });

  await db.insert(regions).values([
    { code: "35", level: 1, name: "Jawa Timur" },
    { code: "35.78", parentCode: "35", level: 2, name: "Kota Surabaya" },
    { code: "35.78.08", parentCode: "35.78", level: 3, name: "Gubeng" },
    { code: "35.78.08.1001", parentCode: "35.78.08", level: 4, name: "Airlangga", postalCode: "60286" },
  ]);
  const [owner, other] = await db.insert(users).values([{ email: "a@x.id" }, { email: "b@x.id" }]).returning();
  const form = (recipientName: string) => {
    const data = new FormData();
    const fields = { recipientName, phone: "081234567890", street: "Jl. Airlangga 1", villageCode: "35.78.08.1001", postalCode: "60286" };
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  };

  signedIn = owner.id;
  const { address } = await saveAddress({}, form("Ani"));
  assert.ok(address);
  assert.strictEqual(address.village, "Airlangga", "nama wilayah dari tabel regions");

  signedIn = other.id;
  assert.ok((await updateAddress(address.id, {}, form("Budi"))).error);
  assert.ok((await deleteAddress(address.id)).error);
  const row = await db.query.addresses.findFirst({ where: eq(addresses.id, address.id) });
  assert.strictEqual(row?.recipientName, "Ani", "alamat orang lain tidak berubah");

  signedIn = owner.id;
  assert.strictEqual((await updateAddress(address.id, {}, form("Citra"))).address?.recipientName, "Citra");
  assert.deepStrictEqual(await deleteAddress(address.id), {});
  assert.strictEqual(await db.query.addresses.findFirst({ where: eq(addresses.id, address.id) }), undefined);

  signedIn = null;
  assert.ok((await deleteAddress(1)).error, "harus masuk dulu");
});
