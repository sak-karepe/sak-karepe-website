/**
 * Data dummy untuk mencoba pagination halaman admin pengguna (10 pengguna/halaman, 5 pesanan/halaman di detail).
 * Jalankan setelah `npm run db:migrate`: `npm run db:seed-dummy`. Data lama `@dummy.test` dihapus dulu, jadi aman diulang;
 * tambahkan `-- --clean` untuk hanya menghapusnya. Jangan dijalankan di database produksi.
 *
 * Hasil: 35 pengguna (4 halaman). "Budi Paginasi" punya 23 pesanan (5 halaman) dan 2 alamat,
 * "Dummy Pengguna 01" 5 pesanan (pas 1 halaman), "Dummy Pengguna 02" 6 pesanan (2 halaman).
 */
import { inArray, like } from "drizzle-orm";
import { db } from "./index";
import { addresses, orderItems, orders, orderStatuses, users } from "./schema";

const day = 86_400_000;
const statuses: (typeof orderStatuses)[number][] = ["menunggu_konfirmasi", "menunggu_pembayaran", "dibayar", "dikirim", "selesai", "dibatalkan"];

async function main() {
  await db.transaction(async (tx) => {
    const old = tx.select({ id: users.id }).from(users).where(like(users.email, "%@dummy.test"));
    // orders.user_id tidak cascade; item pesanan dan alamat ikut terhapus lewat cascade.
    await tx.delete(orders).where(inArray(orders.userId, old));
    await tx.delete(users).where(like(users.email, "%@dummy.test"));
    if (process.argv.includes("--clean")) return;

    const now = Date.now();
    const rows = await tx
      .insert(users)
      .values([
        { email: "budi@dummy.test", name: "Budi Paginasi", createdAt: new Date(now - 40 * day) },
        ...Array.from({ length: 34 }, (_, i) => ({
          email: `user${String(i + 1).padStart(2, "0")}@dummy.test`,
          // Sebagian tanpa nama agar tampilan "Tanpa Nama" ikut teruji.
          name: (i + 1) % 7 === 0 ? null : `Dummy Pengguna ${String(i + 1).padStart(2, "0")}`,
          createdAt: new Date(now - (i + 1) * day),
        })),
      ])
      .returning({ id: users.id, email: users.email });
    const id = (email: string) => rows.find((row) => row.email === email)!.id;

    await tx.insert(addresses).values([
      { userId: id("budi@dummy.test"), recipientName: "Budi Paginasi", phone: "081234567890", street: "Jl. Mawar No. 1 RT 01/RW 02", village: "Ketintang", district: "Gayungan", city: "Kota Surabaya", province: "Jawa Timur", postalCode: "60231", notes: "Pagar hijau" },
      { userId: id("budi@dummy.test"), recipientName: "Ibu Budi", phone: "081298765432", street: "Jl. Melati No. 9", village: "Lowokwaru", district: "Lowokwaru", city: "Kota Malang", province: "Jawa Timur", postalCode: "65141" },
    ]);

    const plan = { "budi@dummy.test": 23, "user01@dummy.test": 5, "user02@dummy.test": 6 };
    for (const [email, total] of Object.entries(plan)) {
      for (let i = 1; i <= total; i++) {
        const createdAt = new Date(now - i * 3_600_000);
        const [order] = await tx
          .insert(orders)
          .values({
            code: `DUMMY-${email.split("@")[0]}-${String(i).padStart(2, "0")}`,
            userId: id(email),
            status: statuses[i % statuses.length],
            subtotal: i % 5 === 0 ? null : 150_000 + i * 25_000, // null tampil "Konsultasi"
            notes: "data dummy",
            createdAt,
            updatedAt: createdAt,
          })
          .returning({ id: orders.id });
        // 1-3 item agar ringkasan "+N lainnya" ikut muncul.
        await tx.insert(orderItems).values(
          Array.from({ length: 1 + (i % 3) }, (_, j) => ({ orderId: order.id, productName: `Kebaya Dummy ${j + 1}`, price: 150_000, quantity: j + 1 })),
        );
      }
    }
  });
  console.log(process.argv.includes("--clean") ? "Data dummy dihapus." : "Seed dummy selesai: 35 pengguna, 34 pesanan.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
