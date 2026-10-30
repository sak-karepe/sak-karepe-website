import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/db/schema";
import { historicalHeaders } from "@/lib/historical-csv";
import { cancelHistoricalImport, previewHistoricalImport, saveHistoricalImport } from "@/lib/historical-import";

test("import atomik, pencocokan katalog, deduplikasi, dan pembatalan batch tanpa mengubah stok", async () => {
  const client = createClient({ url: "file::memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const [admin] = await db.insert(schema.users).values({ email: "admin-import@example.com", role: "admin" }).returning();
    await db.insert(schema.categories).values({ slug: "tas", title: "Tas", subtitle: "", description: "", intro: "", character: "", coverImage: "" });
    const [product] = await db.insert(schema.products).values({ name: "Tas daun", slug: "tas-daun", categorySlug: "tas", stock: 9, price: 999 }).returning();
    const header = historicalHeaders.join(",") + "\n";
    const first = "25/12/2020,N1,Sari,08123,Tas daun,2,100,50,transfer,lama\n" +
      "25/12/2020,N1,Sari,08123,Item lama,1,200,50,transfer,lama\n";
    const second = "01/01/2021,N2,Budi,,tas daun,1,300,0,tunai,\n";
    const csv = header + first + second;
    const preview = await previewHistoricalImport(db, csv);
    assert.deepEqual(preview.errors, []);
    assert.deepEqual(preview.rows.map((row) => row.productId), [product.id, null, null]);
    assert.equal(preview.orderCount, 2);
    assert.deepEqual(preview.rows.map((row) => row.duplicateLines), [[3], [2], []], "duplikat nota menunjuk baris lain, bukan dirinya sendiri");
    assert.ok(preview.rows.every((row) => !row.duplicate), "nomor nota berulang dalam CSV belum tentu sudah tersimpan");
    assert.equal((await db.query.orders.findMany()).length, 0, "preview tidak menyimpan apa pun");

    const invalidCsv = csv + "31/02/2020,N3,Sari,,Tas daun,,100,0,tunai,";
    const invalidPreview = await previewHistoricalImport(db, invalidCsv);
    assert.equal(invalidPreview.rows.length, 4, "preview tetap menampilkan baris salah");
    assert.equal(invalidPreview.rows[3].errors.length, 2);
    const invalid = await saveHistoricalImport(db, invalidCsv, admin.id);
    assert.ok(invalid.errors.some((error) => error.line === 5));
    assert.equal((await db.query.orders.findMany()).length, 0, "satu baris salah membatalkan seluruh file");

    const saved = await saveHistoricalImport(db, csv, admin.id);
    assert.equal(saved.inserted, 2);
    assert.ok(saved.batchId);
    const orders = await db.query.orders.findMany({ orderBy: schema.orders.id, with: { items: true, payments: true, events: true } });
    assert.equal(orders[0].source, "historis");
    assert.equal(orders[0].status, "selesai");
    assert.equal(orders[0].externalRef, "N1");
    assert.equal(orders[0].userId, null);
    assert.equal(orders[0].recordedBy, admin.id);
    assert.equal(orders[0].customerPhone, "08123");
    assert.equal(orders[0].createdAt.toISOString(), "2020-12-24T17:00:00.000Z");
    assert.equal(orders[0].subtotal, 400);
    assert.equal(orders[0].payments[0].amount, 450, "ongkir dihitung sekali");
    assert.equal(orders[0].payments[0].paidAt?.getTime(), orders[0].createdAt.getTime());
    assert.equal(orders[0].items[0].price, 100, "harga historis, bukan harga katalog");
    assert.equal(orders[0].items[0].productId, product.id);
    assert.equal(orders[0].items[1].productId, null);
    assert.equal(orders[0].events[0].userId, admin.id);
    assert.equal((await db.query.products.findFirst())?.stock, 9);

    const again = await saveHistoricalImport(db, csv, admin.id);
    assert.deepEqual([again.inserted, again.skipped, again.batchId], [0, 2, null]);
    const duplicatePreview = await previewHistoricalImport(db, csv);
    assert.equal(duplicatePreview.skipped, 2);
    assert.ok(duplicatePreview.rows.every((row) => row.duplicate));
    assert.deepEqual(duplicatePreview.rows.map((row) => row.duplicateLines), [[3], [2], []]);
    assert.equal((await db.query.orderItems.findMany()).length, 3);
    assert.equal((await db.query.payments.findMany()).length, 2);

    const other = await saveHistoricalImport(db, header + first + second.replace("N2", "N3"), admin.id);
    assert.deepEqual([other.inserted, other.skipped], [1, 1]);
    // Sumber lain dengan batch yang sama tidak boleh ikut dihapus.
    await db.insert(schema.orders).values({ code: "ONLINE", source: "online", importBatchId: saved.batchId });
    assert.equal(await cancelHistoricalImport(db, saved.batchId!), 2);
    assert.equal(await cancelHistoricalImport(db, saved.batchId!), 0);
    assert.deepEqual((await db.query.orders.findMany()).map((order) => order.externalRef), ["N3", null]);
    assert.equal((await db.query.orderItems.findMany()).length, 1);
    assert.equal((await db.query.payments.findMany()).length, 1);
    assert.equal((await db.query.orderEvents.findMany()).length, 1);
    assert.equal((await db.query.products.findFirst())?.stock, 9);
    assert.equal((await saveHistoricalImport(db, header + first, admin.id)).inserted, 1, "nota bisa diimport ulang setelah dibatalkan");

    // Gangguan setelah order/item ditulis harus rollback, termasuk order sebelumnya dalam batch.
    await client.execute("CREATE TRIGGER fail_import BEFORE INSERT ON payments WHEN NEW.amount = 777 BEGIN SELECT RAISE(ABORT, 'test failure'); END");
    const count = (await db.query.orders.findMany()).length;
    await assert.rejects(saveHistoricalImport(db, header + second.replace("N2", "N4") + second.replace("N2", "N5").replace("300", "777"), admin.id));
    assert.equal((await db.query.orders.findMany()).length, count);
    assert.equal((await db.query.orderItems.findMany()).length, 3);
    assert.equal((await db.query.products.findFirst())?.stock, 9);
  } finally { client.close(); }
});
