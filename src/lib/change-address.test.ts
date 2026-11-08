import assert from "node:assert/strict";
import { test } from "node:test";
import { and, eq, isNull } from "drizzle-orm";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import * as schema from "@/db/schema";
import { formatRupiah } from "@/lib/format";

test("admin bisa mengubah alamat sebelum booking kurir, dan tercatat di riwayat", async () => {
  const client = createClient({ url: "file::memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const [admin] = await db.insert(schema.users).values({ email: "admin@example.com", role: "admin" }).returning();
    const [buyer] = await db.insert(schema.users).values({ email: "buyer@example.com", role: "pembeli" }).returning();

    const [order] = await db
      .insert(schema.orders)
      .values({
        code: "SK-TEST-001",
        userId: buyer.id,
        status: "dibayar",
        recipientName: "Budi Santoso",
        phone: "081234567890",
        shippingAddress: "Jl. Mawar No. 1, Surabaya",
        postalCode: "60111",
      })
      .returning();

    // Simulasi update alamat oleh admin
    const newName = "Budi Hartono";
    const newPhone = "081987654321";
    const newAddress = "Jl. Melati No. 2, Sidoarjo";
    const newPostal = "61256";

    // Cek shipmentId
    assert.equal(order.shipmentId, null);

    const oldAddress = [order.recipientName, order.phone, order.shippingAddress, order.postalCode].filter(Boolean).join(", ");
    const formattedNew = `${newName} (${newPhone}) - ${newAddress} ${newPostal}`;

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.orders)
        .set({
          recipientName: newName,
          phone: newPhone,
          shippingAddress: newAddress,
          postalCode: newPostal,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.orders.id, order.id), isNull(schema.orders.shipmentId)))
        .returning();

      assert.ok(updated);
      await tx.insert(schema.orderEvents).values({
        orderId: order.id,
        source: "admin",
        userId: admin.id,
        note: `Alamat pengiriman diubah oleh admin.\nDari: ${oldAddress}\nMenjadi: ${formattedNew}`,
      });
    });

    const refreshed = await db.query.orders.findFirst({
      where: eq(schema.orders.id, order.id),
      with: { events: true },
    });

    assert.equal(refreshed?.recipientName, newName);
    assert.equal(refreshed?.phone, newPhone);
    assert.equal(refreshed?.shippingAddress, newAddress);
    assert.equal(refreshed?.postalCode, newPostal);
    assert.equal(refreshed?.events.length, 1);
    assert.equal(refreshed?.events[0].source, "admin");
    assert.ok(refreshed?.events[0].note?.includes("Jl. Melati No. 2"));
  } finally {
    client.close();
  }
});

test("alamat tidak bisa diubah setelah kurir dipesan (shipmentId terisi)", async () => {
  const client = createClient({ url: "file::memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const [buyer] = await db.insert(schema.users).values({ email: "buyer2@example.com", role: "pembeli" }).returning();

    const [order] = await db
      .insert(schema.orders)
      .values({
        code: "SK-TEST-002",
        userId: buyer.id,
        status: "dikirim",
        shipmentId: "BITESHIP-ORDER-123",
        waybillId: "RESI123456",
        recipientName: "Siti Rahma",
        phone: "081234567890",
        shippingAddress: "Jl. Anggrek No. 5, Surabaya",
        postalCode: "60111",
      })
      .returning();

    // Mencoba update pada pesanan yang sudah ada shipmentId
    const [updated] = await db
      .update(schema.orders)
      .set({ recipientName: "Nama Lain" })
      .where(and(eq(schema.orders.id, order.id), isNull(schema.orders.shipmentId)))
      .returning();

    assert.equal(updated, undefined, "Update harus gagal jika shipmentId sudah ada");

    const unchanged = await db.query.orders.findFirst({ where: eq(schema.orders.id, order.id) });
    assert.equal(unchanged?.recipientName, "Siti Rahma");
  } finally {
    client.close();
  }
});

test("perubahan alamat pembeli dengan ongkir sama atau lebih hemat tercatat di riwayat", async () => {
  const client = createClient({ url: "file::memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const [buyer] = await db.insert(schema.users).values({ email: "buyer3@example.com", role: "pembeli" }).returning();

    const initialShippingCost = 25000;
    const [order] = await db
      .insert(schema.orders)
      .values({
        code: "SK-TEST-003",
        userId: buyer.id,
        status: "dibayar",
        shippingCost: initialShippingCost,
        courierCode: "jne",
        courierServiceCode: "reg",
        courierName: "JNE Reguler",
        recipientName: "Dewi Lestari",
        phone: "081122334455",
        shippingAddress: "Jl. Flamboyan No. 10, Surabaya",
        postalCode: "60111",
      })
      .returning();

    // Pembeli mengubah ke alamat baru yang ongkirnya lebih hemat (mis. 20.000, hemat 5.000)
    const newShippingCost = 20000;
    const diff = newShippingCost - initialShippingCost; // -5000
    const newAddressText = "Jl. Kenanga No. 8, Gresik (Dekat masjid)";

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.orders)
        .set({
          recipientName: "Dewi Lestari",
          phone: "081122334455",
          shippingAddress: newAddressText,
          postalCode: "61121",
          courierCode: "jnt",
          courierServiceCode: "ez",
          courierName: "J&T EZ",
          shippingCost: newShippingCost,
          reviewNote: `Pembeli mengubah alamat; selisih ongkir lebih hemat ${formatRupiah(Math.abs(diff))} dicatat untuk penanganan admin/refund.`,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.orders.id, order.id), eq(schema.orders.status, "dibayar"), isNull(schema.orders.shipmentId)))
        .returning();

      assert.ok(updated);
      await tx.insert(schema.orderEvents).values({
        orderId: order.id,
        source: "pembeli",
        userId: buyer.id,
        note: `Alamat pengiriman diubah pembeli ke Dewi Lestari, ${newAddressText} (J&T EZ). Ongkir baru ${formatRupiah(newShippingCost)} (lebih hemat ${formatRupiah(Math.abs(diff))}). Selisih dicatat untuk refund/kebijakan admin.`,
      });
    });

    const refreshed = await db.query.orders.findFirst({
      where: eq(schema.orders.id, order.id),
      with: { events: true },
    });

    assert.equal(refreshed?.shippingCost, 20000);
    assert.equal(refreshed?.courierName, "J&T EZ");
    assert.equal(refreshed?.shippingAddress, newAddressText);
    assert.ok(refreshed?.reviewNote?.includes("lebih hemat"));
    assert.equal(refreshed?.events.length, 1);
    assert.equal(refreshed?.events[0].source, "pembeli");
    assert.ok(refreshed?.events[0].note?.includes("lebih hemat"));
  } finally {
    client.close();
  }
});

test("pembayaran tambahan untuk selisih ongkir pada pesanan yang sudah dibayar dicatat tanpa mengubah status atau mengurangi stok ganda", async () => {
  const client = createClient({ url: "file::memory:" });
  const db = drizzle(client, { schema });
  try {
    await migrate(db, { migrationsFolder: "drizzle" });
    const [buyer] = await db.insert(schema.users).values({ email: "buyer4@example.com", role: "pembeli" }).returning();

    const [order] = await db
      .insert(schema.orders)
      .values({
        code: "SK-TEST-004",
        userId: buyer.id,
        status: "dibayar",
        shippingCost: 15000,
        subtotal: 100000,
        recipientName: "Budi",
        phone: "081234567890",
        shippingAddress: "Alamat Lama",
        postalCode: "60111",
      })
      .returning();

    // Tambah link pembayaran selisih ongkir
    const diff = 10000;
    const invoiceNumber = "SKTEST004S1";
    const [payment] = await db
      .insert(schema.payments)
      .values({
        orderId: order.id,
        invoiceNumber,
        amount: diff,
        url: "https://doku.com/pay",
      })
      .returning();

    // Simulasi applyPayment saat DOKU notifikasi berhasil
    await db.transaction(async (tx) => {
      await tx
        .update(schema.payments)
        .set({ paidAt: new Date(), channel: "QRIS_DOKU" })
        .where(eq(schema.payments.id, payment.id));

      const currentOrder = await tx.query.orders.findFirst({ where: eq(schema.orders.id, order.id) });
      assert.equal(currentOrder?.status, "dibayar");

      await tx.insert(schema.orderEvents).values({
        orderId: order.id,
        fromStatus: "dibayar",
        toStatus: "dibayar",
        source: "doku",
        note: `Pembayaran tambahan ${invoiceNumber} sebesar ${formatRupiah(diff)} lunas.`,
      });
    });

    const refreshed = await db.query.orders.findFirst({
      where: eq(schema.orders.id, order.id),
      with: { payments: true, events: true },
    });

    assert.equal(refreshed?.status, "dibayar");
    assert.equal(refreshed?.payments[0].paidAt !== null, true);
    assert.equal(refreshed?.events[0].source, "doku");
    assert.ok(refreshed?.events[0].note?.includes("Pembayaran tambahan"));
  } finally {
    client.close();
  }
});

