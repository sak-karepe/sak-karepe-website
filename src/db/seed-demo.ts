/**
 * Data contoh untuk DB lokal. Jalankan setelah `npm run db:reset`: `npm run db:seed-dummy`
 * (menolak berjalan bila sudah ada pesanan). `npm run db:seed-dummy -- --clean` hanya menghapus data `@dummy.test`/`DUMMY-`.
 *
 * Demo: harga/stok produk, pembeli, ~4 bulan pesanan (online, langsung, historis) di semua status,
 * pembayaran, riwayat status, pengiriman, dan pengeluaran.
 *
 * Dummy pagination admin pengguna (10 pengguna/halaman, 5 pesanan/halaman di detail): 35 pengguna (4 halaman).
 * "Budi Paginasi" punya 23 pesanan (5 halaman) dan 2 alamat, "Dummy Pengguna 01" 5 pesanan (pas 1 halaman),
 * "Dummy Pengguna 02" 6 pesanan (2 halaman). Untuk export CSV: pesanan tersebar per 12 jam, yang sudah dibayar punya
 * pembayaran lunas (+ kurir/resi bila dikirim), ditambah 6 pesanan langsung/historis tanpa akun, sebagian dengan
 * nama berisi ; " dan rumus agar escaping ikut teruji.
 */
import { and, eq, inArray, like, or } from "drizzle-orm";
import { db } from "./index";
import {
  addresses,
  expenses,
  orderEvents,
  orderItems,
  orders,
  payments,
  products,
  regions,
  shipmentHistory,
  users,
  type orderStatuses,
} from "./schema";

type Status = (typeof orderStatuses)[number];
const hour = 3_600_000;
const day = 24 * hour;
const now = Date.now();
const dummyStatuses: Status[] = ["menunggu_konfirmasi", "menunggu_pembayaran", "dibayar", "dikirim", "selesai", "dibatalkan"];

// PRNG tetap agar hasil seed sama setiap kali dijalankan.
let seed = 20261113;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
const between = (min: number, max: number) => Math.floor(min + rand() * (max - min + 1));
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const suffix = () => Array.from({ length: 4 }, () => pick([...alphabet])).join("");
const yymmdd = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "2-digit", month: "2-digit", day: "2-digit" }).format(date).replaceAll("-", "");

/** id produk hasil `db:seed` -> nama, harga, stok, berat, deskripsi. Harga null = lewat konsultasi. */
const catalog: Record<number, [string, number | null, number | null, number, string]> = {
  1: ["Setelan Ecoprint Daun Jati", 685000, 12, 600, "Setelan atasan dan bawahan katun dengan jejak daun jati bernuansa hijau kekuningan."],
  2: ["Outer Ecoprint Malam", 545000, 8, 500, "Luaran rayon bernuansa gelap dengan motif daun ketapang."],
  3: ["Blus Daun Kenikir Merah Muda", 395000, 6, 350, "Blus katun dengan jejak daun kenikir bernuansa merah muda."],
  4: ["Kebaya Ecoprint Sekar Batik", 875000, 2, 450, "Perpaduan motif daun dan detail batik tulis pada kebaya modern."],
  5: ["Dress Lurik Daun", 625000, 9, 500, "Dress katun dengan motif daun dan kombinasi kain lurik bergaris."],
  6: ["Set Luaran Biru Indigo", 750000, 7, 650, "Busana biru gelap pewarna indigo, dipadukan luaran bermotif daun."],
  7: ["Dress Panjang Alam", 695000, 8, 550, "Dress panjang bernuansa alami dengan motif daun jarak dan jati."],
  8: ["Busana Panggung Indigo (pesanan khusus)", null, null, 800, "Busana panggung dari koleksi fashion show. Ukuran dan detail dibuat sesuai pesanan."],
  9: ["Gaun Panggung Daun (pesanan khusus)", null, null, 800, "Gaun panjang dari panggung fashion show. Dibuat sesuai pesanan setelah konsultasi."],
  10: ["Setelan Luaran Hijau Daun", 725000, 9, 650, "Setelan dan luaran ecoprint bernuansa hijau dari daun lanang."],
  11: ["Rok Asimetris Ecoprint", 445000, 14, 400, "Rok asimetris dengan jejak daun eucalyptus."],
  12: ["Atasan Daun dan Celana Linen", 585000, 10, 600, "Atasan bermotif daun dengan celana linen berwarna terang."],
  13: ["Dress Pameran Ecoprint", 650000, 1, 500, "Busana panjang bermotif ecoprint yang dipamerkan di Surabaya."],
  14: ["Tote Bag Daun Hijau Kuning", 165000, 15, 300, "Tote bag kanvas dengan jejak daun hijau dan kuning."],
  15: ["Tas Anyaman Panel Ecoprint", 285000, 6, 450, "Tas anyaman pandan dengan panel kain ecoprint cokelat."],
  16: ["Tote Bag Daun Cokelat", 165000, 12, 300, "Tote bag kanvas dengan susunan daun jati bernuansa cokelat."],
  17: ["Tas Selempang Mini Daun", 195000, 8, 250, "Tas kecil dengan panel motif daun, muat ponsel dan dompet."],
  18: ["Tas Kain Daun Gelap", 175000, 2, 300, "Tas kain dengan motif daun gelap dari pewarna tingi."],
  19: ["Tas Kain Daun Senja", 175000, 10, 300, "Tas kain bermotif daun kuning dan cokelat."],
  20: ["Slip-on Ecoprint Urat Daun", 325000, 7, 700, "Sepatu slip-on kanvas dengan motif urat daun hitam dan putih."],
  21: ["Kain Ecoprint Lurik Ungu", 425000, 11, 400, "Kain 2 meter bermotif daun hijau dan ungu dengan tepi lurik."],
  22: ["Kain Ecoprint Tepi Garis", 395000, 0, 400, "Kain 2 meter bermotif daun dengan tepi bergaris."],
  23: ["Kain Terang Jejak Daun", 375000, 6, 400, "Kain katun primisima 2 meter dengan jejak daun gelap."],
  24: ["Cangkir Keramik Daun Cokelat", 95000, 20, 400, "Cangkir keramik dengan motif daun bernuansa cokelat."],
  25: ["Set 4 Cangkir Daun", 340000, 3, 1500, "Set empat cangkir keramik dengan ragam motif daun."],
};

const buyers = [
  { name: "Rina Wulandari", phone: "081231457890", city: "Kota Surabaya", street: "Jl. Kertajaya Indah VII No. 12" },
  { name: "Andi Saputra", phone: "085648213377", city: "Kota Malang", street: "Jl. Soekarno Hatta Blok D No. 4" },
  { name: "Maya Kusuma", phone: "081332908765", city: "Kota Yogyakarta", street: "Jl. Kaliurang Km 5, Gg. Pandega Marta 3" },
  { name: "Fajar Hidayat", phone: "087853120044", city: "Kota Surabaya", street: "Jl. Manyar Kertoarjo V No. 21" },
  { name: "Nadia Putri", phone: "081215559012", city: "Kota Semarang", street: "Jl. Pandanaran No. 88" },
  { name: "Yoga Permana", phone: "082140026671", city: "Kabupaten Sidoarjo", street: "Perum Taman Pinang Indah Blok B3 No. 7" },
  { name: "Laras Ayuningtyas", phone: "081389017720", city: "Kota Bandung", street: "Jl. Dago Asri No. 15" },
  { name: "Bima Santoso", phone: "085799104433", city: "Kota Denpasar", street: "Jl. Tukad Badung No. 30" },
];
const couriers = [
  { code: "jne", service: "reg", name: "JNE Reguler", cost: [15000, 28000] },
  { code: "jnt", service: "ez", name: "J&T EZ", cost: [14000, 26000] },
  { code: "sicepat", service: "reg", name: "SiCepat REG", cost: [13000, 25000] },
] as const;
const walkIn = ["Ibu Hartini", "Bu Endang (Pameran Grand City)", "Mbak Sinta", "Pak Agus Salim", "Tante Linda", "Ibu Ratna Dewi", "Mas Rizky", "Bu Wati", "Kak Dian", "Ibu Sulastri"];

async function demo() {
  // Produk: nama, harga, stok, berat, deskripsi.
  for (const [id, [name, price, stock, weight, description]] of Object.entries(catalog))
    await db.update(products).set({ name, price, stock, weight, description }).where(eq(products.id, Number(id)));
  const priced = (await db.select().from(products)).filter((product) => product.price !== null && product.stock !== 0);

  await db.transaction(async (tx) => {
    // Pembeli dengan alamat yang memakai data wilayah asli.
    const buyerRows: { id: number; name: string; phone: string; address: string; postal: string }[] = [];
    for (const [index, buyer] of buyers.entries()) {
      const [city] = await tx.select().from(regions).where(and(eq(regions.level, 2), eq(regions.name, buyer.city))).limit(1);
      const [district] = city ? await tx.select().from(regions).where(eq(regions.parentCode, city.code)).limit(1) : [];
      const [village] = district ? await tx.select().from(regions).where(eq(regions.parentCode, district.code)).limit(1) : [];
      const [province] = city?.parentCode ? await tx.select().from(regions).where(eq(regions.code, city.parentCode)) : [];
      const createdAt = new Date(now - (140 - index * 9) * day);
      const email = `${buyer.name.toLowerCase().split(" ")[0]}.${buyer.name.toLowerCase().split(" ")[1]}@example.com`;
      const [user] = await tx.insert(users).values({ email, name: buyer.name, createdAt }).returning({ id: users.id });
      const address = {
        recipientName: buyer.name,
        phone: buyer.phone,
        street: buyer.street,
        village: village?.name ?? "",
        district: district?.name ?? buyer.city,
        city: city?.name ?? buyer.city,
        province: province?.name ?? "Jawa Timur",
        villageCode: village?.code ?? null,
        postalCode: village?.postalCode ?? "60111",
      };
      await tx.insert(addresses).values({ userId: user.id, ...address, createdAt });
      buyerRows.push({
        id: user.id,
        name: buyer.name,
        phone: buyer.phone,
        address: [address.street, address.village && `Kel. ${address.village}`, `Kec. ${address.district}`, address.city, address.province].filter(Boolean).join(", "),
        postal: address.postalCode,
      });
    }

    const items = () => {
      const chosen = [...priced].sort(() => rand() - 0.5).slice(0, between(1, 3));
      return chosen.map((product) => ({ productId: product.id, productName: product.name, price: product.price!, quantity: rand() < 0.8 ? 1 : 2 }));
    };
    const event = (orderId: number, fromStatus: Status | null, toStatus: Status, source: "admin" | "pembeli" | "doku" | "biteship" | "sistem", at: number, note?: string) =>
      tx.insert(orderEvents).values({ orderId, fromStatus, toStatus, source, note, createdAt: new Date(at) });

    /** Pesanan online lengkap dengan pembayaran, kurir, dan riwayat status sampai `status`. */
    async function online(daysAgo: number, status: Status, extra: Partial<typeof orders.$inferInsert> = {}) {
      const buyer = pick(buyerRows);
      const created = now - daysAgo * day - between(0, 10) * hour;
      const lines = items();
      const consult = status === "menunggu_konfirmasi";
      const subtotal = consult ? null : lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
      const courier = pick(couriers);
      const shippingCost = consult ? null : Math.round(between(courier.cost[0], courier.cost[1]) / 1000) * 1000;
      const code = `SK-${yymmdd(new Date(created))}-${suffix()}`;
      const paidAt = created + between(1, 20) * hour;
      const shipped = ["dikirim", "gagal_kirim", "sampai", "retur", "selesai"].includes(status) || (status === "refund" && extra.waybillId);
      const shippedAt = paidAt + between(4, 30) * hour;
      const deliveredAt = shippedAt + between(2, 4) * day;
      const last = { menunggu_konfirmasi: created, menunggu_checkout: created + 2 * hour, menunggu_pembayaran: created + 3 * hour, dibayar: paidAt, dikirim: shippedAt, gagal_kirim: shippedAt + 3 * day, sampai: deliveredAt, retur: deliveredAt + day, selesai: deliveredAt + 2 * day, refund: paidAt + 2 * day, dibatalkan: created + 2 * day }[status];
      const [order] = await tx
        .insert(orders)
        .values({
          code,
          userId: buyer.id,
          status,
          subtotal,
          shippingCost,
          recipientName: consult ? null : buyer.name,
          phone: consult ? null : buyer.phone,
          shippingAddress: consult ? null : buyer.address,
          postalCode: consult ? null : buyer.postal,
          courierCode: consult ? null : courier.code,
          courierServiceCode: consult ? null : courier.service,
          courierName: consult ? null : courier.name,
          ...(shipped && {
            shipmentId: `demo-${code}`,
            waybillId: `${courier.code.toUpperCase()}${between(10_000_000, 99_999_999)}`,
            collectionMethod: "pickup" as const,
            shipmentStatus: status === "gagal_kirim" ? "returned" : ["sampai", "retur", "selesai"].includes(status) ? "delivered" : "dropping_off",
          }),
          ...(["sampai", "retur", "selesai"].includes(status) && { deliveredAt: new Date(deliveredAt) }),
          notes: rand() < 0.3 ? pick(["Tolong dibungkus kado ya.", "Ukuran M kalau ada.", "Kirim sebelum tanggal 20.", "Warna seperti di foto."]) : "",
          createdAt: new Date(created),
          updatedAt: new Date(last),
          ...extra,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));

      // Riwayat status, urut sesuai alur.
      await event(order.id, null, "menunggu_konfirmasi", "pembeli", created);
      if (consult) return order.id;
      await event(order.id, "menunggu_konfirmasi", "menunggu_checkout", "admin", created + 2 * hour, "Harga dan ongkir dikonfirmasi lewat WhatsApp");
      if (status === "menunggu_checkout") return order.id;
      const amount = subtotal! + shippingCost!;
      const isPaid = !["menunggu_pembayaran", "dibatalkan"].includes(status);
      await tx.insert(payments).values({
        orderId: order.id,
        method: "doku",
        invoiceNumber: `${code.replaceAll("-", "")}P1`,
        amount,
        url: "https://checkout.doku.com/demo",
        expiresAt: new Date(status === "menunggu_pembayaran" ? now + 20 * hour : created + 27 * hour),
        paidAt: isPaid ? new Date(paidAt) : null,
        channel: isPaid ? pick(["QRIS_DOKU", "VIRTUAL_ACCOUNT_BCA", "VIRTUAL_ACCOUNT_BRI", "QRIS_DOKU"]) : null,
        createdAt: new Date(created + 3 * hour),
      });
      await event(order.id, "menunggu_checkout", "menunggu_pembayaran", "pembeli", created + 3 * hour);
      if (status === "menunggu_pembayaran") return order.id;
      if (status === "dibatalkan") {
        await event(order.id, "menunggu_pembayaran", "dibatalkan", "sistem", created + 2 * day, "Otomatis: tidak dibayar sampai batas waktu");
        return order.id;
      }
      await event(order.id, "menunggu_pembayaran", "dibayar", "doku", paidAt);
      if (status === "refund") {
        await event(order.id, "dibayar", "refund", "admin", paidAt + 2 * day, "Stok habis, dana dikembalikan ke pembeli");
        return order.id;
      }
      if (status === "dibayar") return order.id;
      await event(order.id, "dibayar", "dikirim", "admin", shippedAt);
      if (status === "dikirim") return order.id;
      if (status === "gagal_kirim") {
        await event(order.id, "dikirim", "gagal_kirim", "biteship", shippedAt + 3 * day, "Alamat tidak ditemukan kurir");
        return order.id;
      }
      await event(order.id, "dikirim", "sampai", "biteship", deliveredAt);
      if (status === "retur") {
        await event(order.id, "sampai", "retur", "pembeli", deliveredAt + day, "Ukuran tidak sesuai, minta tukar");
        return order.id;
      }
      await event(order.id, "sampai", "selesai", rand() < 0.5 ? "pembeli" : "sistem", deliveredAt + 2 * day);
      return order.id;
    }

    // ~4 bulan pesanan online: yang lama sebagian besar selesai, yang baru tersebar di status yang sedang berjalan.
    for (let daysAgo = 118; daysAgo > 9; daysAgo -= between(2, 4)) await online(daysAgo, rand() < 0.88 ? "selesai" : "dibatalkan");
    await online(64, "refund");
    await online(41, "retur");
    const resent = await online(33, "selesai");
    await online(8, "selesai");
    await online(6, "sampai");
    await online(5, "dikirim");
    await online(4, "dikirim");
    await online(3, "gagal_kirim");
    await online(2, "dibayar"); // dibayar >24 jam tanpa resi: muncul di "Perlu dicek"
    await online(0.2, "dibayar");
    await online(1, "menunggu_pembayaran");
    await online(0.5, "menunggu_pembayaran");
    await online(1, "menunggu_checkout");
    await online(0.3, "menunggu_konfirmasi");
    await online(0.1, "menunggu_konfirmasi");
    // Paket tertahan kurir lebih dari 3 hari: muncul di "Perlu dicek".
    const held = await online(7, "dikirim");
    await tx.update(orders).set({ shipmentStatus: "on_hold", updatedAt: new Date(now - 4 * day) }).where(eq(orders.id, held));

    // Satu pesanan pernah gagal kirim lalu dikirim ulang atas biaya toko (ikut pengeluaran otomatis).
    await tx.insert(shipmentHistory).values({
      orderId: resent,
      shipmentId: `demo-old-${resent}`,
      waybillId: `JNE${between(10_000_000, 99_999_999)}`,
      courierName: "JNE Reguler",
      shipmentStatus: "returned",
      note: "Penerima tidak di tempat",
      resendPaidBy: "sak_karepe",
      createdAt: new Date(now - 30 * day),
    });

    // Penjualan langsung (pameran/toko) dan data historis dari nota lama.
    for (let i = 0; i < 16; i++) {
      const created = new Date(now - between(1, 115) * day - between(0, 8) * hour);
      const lines = items();
      const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
      const [order] = await tx
        .insert(orders)
        .values({
          code: `SK-OFF-${yymmdd(created)}-${suffix()}`,
          source: "langsung",
          customerName: pick(walkIn),
          customerPhone: rand() < 0.6 ? `08${between(1_100_000_000, 1_999_999_999)}` : null,
          status: "selesai",
          subtotal,
          notes: rand() < 0.4 ? "Pameran kriya Grand City Surabaya" : "",
          createdAt: created,
          updatedAt: created,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
      await tx.insert(payments).values({ orderId: order.id, method: pick(["tunai", "qris", "transfer", "tunai"]), amount: subtotal, paidAt: created, createdAt: created });
      await event(order.id, null, "selesai", "admin", created.getTime(), "Penjualan langsung dicatat admin");
    }
    for (let i = 0; i < 10; i++) {
      const created = new Date(now - between(150, 300) * day);
      const lines = items();
      const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
      const [order] = await tx
        .insert(orders)
        .values({
          code: `SK-HIS-${yymmdd(created)}-${suffix()}`,
          source: "historis",
          customerName: pick(walkIn),
          externalRef: `NOTA-2026-${String(i + 1).padStart(3, "0")}`,
          importBatchId: "demo-import",
          status: "selesai",
          subtotal,
          createdAt: created,
          updatedAt: created,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order.id })));
    }

    // Pengeluaran rutin 4 bulan terakhir.
    for (let month = 0; month < 4; month++) {
      const at = (dayOfMonth: number) => {
        const date = new Date(now);
        date.setUTCMonth(date.getUTCMonth() - month, dayOfMonth);
        date.setUTCHours(-7, 0, 0, 0); // awal hari WIB
        return date.getTime() > now ? null : date;
      };
      const rows = [
        { day: 3, category: "modal", amount: between(9, 14) * 100_000, note: "Kain katun primisima dan rayon" },
        { day: 10, category: "modal", amount: between(3, 6) * 100_000, note: "Pewarna alami (tingi, tegeran, indigo) dan tawas" },
        { day: 5, category: "operasional", amount: 450_000, note: "Listrik dan air workshop" },
        { day: 5, category: "operasional", amount: 350_000, note: "Internet bulanan" },
        { day: 25, category: "pembayaran", amount: between(60, 120) * 1_000, note: "Biaya transaksi DOKU bulan ini" },
        { day: 18, category: "lainnya", amount: month === 1 ? 1_500_000 : 0, note: "Sewa booth pameran kriya" },
        { day: 20, category: "ongkir", amount: between(2, 4) * 25_000, note: "Kirim sampel ke pembeli grosir" },
      ] as const;
      for (const row of rows) {
        const spentAt = at(row.day);
        if (spentAt && row.amount) await tx.insert(expenses).values({ spentAt, category: row.category, amount: row.amount, note: row.note, createdAt: spentAt });
      }
    }
  });
}

async function dummy() {
  await db.transaction(async (tx) => {
    const old = tx.select({ id: users.id }).from(users).where(like(users.email, "%@dummy.test"));
    // orders.user_id tidak cascade; item pesanan dan alamat ikut terhapus lewat cascade.
    await tx.delete(orders).where(or(inArray(orders.userId, old), like(orders.code, "DUMMY-%")));
    await tx.delete(users).where(like(users.email, "%@dummy.test"));
    if (process.argv.includes("--clean")) return;

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
        const createdAt = new Date(now - i * 12 * 3_600_000);
        const status = dummyStatuses[i % dummyStatuses.length];
        const paid = status === "dibayar" || status === "dikirim" || status === "selesai";
        const shipped = status === "dikirim" || status === "selesai";
        // null tampil "Konsultasi"; pesanan yang sudah dibayar selalu punya harga (admin mengisinya sebelum checkout).
        const subtotal = i % 5 === 0 && !paid ? null : 150_000 + i * 25_000;
        const [order] = await tx
          .insert(orders)
          .values({
            code: `DUMMY-${email.split("@")[0]}-${String(i).padStart(2, "0")}`,
            userId: id(email),
            status,
            subtotal,
            ...(paid && { recipientName: "Budi Paginasi", phone: "081234567890", shippingAddress: "Jl. Mawar No. 1, Surabaya", postalCode: "60231", shippingCost: 18_000 }),
            ...(shipped && { courierName: "J&T EZ", waybillId: `JX${1000 + i}` }),
            notes: "data dummy",
            createdAt,
            updatedAt: createdAt,
          })
          .returning({ id: orders.id });
        // 1-3 item agar ringkasan "+N lainnya" ikut muncul.
        await tx.insert(orderItems).values(
          Array.from({ length: 1 + (i % 3) }, (_, j) => ({ orderId: order.id, productName: `Kebaya Dummy ${j + 1}`, price: 150_000, quantity: j + 1 })),
        );
        if (paid || status === "menunggu_pembayaran") {
          const doku = i % 2 === 0;
          await tx.insert(payments).values({
            orderId: order.id,
            method: doku ? "doku" : "transfer",
            channel: doku ? "QRIS_DOKU" : null,
            amount: (subtotal ?? 500_000) + 18_000,
            paidAt: paid ? new Date(createdAt.getTime() + 3_600_000) : null,
          });
        }
      }
    }

    // Pesanan tanpa akun: tanggal transaksi = createdAt, metode bayar manual.
    const offline = [
      { source: "langsung", customerName: "Sari Butik", customerPhone: "085711112222", method: "tunai" },
      { source: "langsung", customerName: 'Toko "Melati"; Cabang 2', customerPhone: "+62 812-3333-4444", method: "qris" },
      { source: "langsung", customerName: "=HYPERLINK(\"x\")", customerPhone: null, method: "lainnya" },
      { source: "historis", customerName: "Ibu Rahayu", customerPhone: "081355556666", method: "transfer" },
      { source: "historis", customerName: "Pak Joko, Solo", customerPhone: "081377778888", method: "tunai" },
      { source: "historis", customerName: "Dewi", customerPhone: null, method: "transfer" },
    ] as const;
    for (const [i, row] of offline.entries()) {
      const createdAt = new Date(now - (i * 3 + 1) * day);
      const subtotal = 300_000 + i * 50_000;
      const [order] = await tx
        .insert(orders)
        .values({
          code: `DUMMY-${row.source}-${i + 1}`,
          source: row.source,
          customerName: row.customerName,
          customerPhone: row.customerPhone,
          externalRef: row.source === "historis" ? `NOTA-${2024000 + i}` : null,
          status: "selesai",
          subtotal,
          notes: "data dummy",
          createdAt,
          updatedAt: createdAt,
        })
        .returning({ id: orders.id });
      await tx.insert(orderItems).values({ orderId: order.id, productName: "Kebaya Encim, putih", price: subtotal, quantity: 1 });
      await tx.insert(payments).values({ orderId: order.id, method: row.method, amount: subtotal, paidAt: createdAt });
    }
  });
}

async function main() {
  if (process.argv.includes("--clean")) {
    await dummy();
    return console.log("Data dummy dihapus.");
  }
  if (await db.$count(orders)) throw new Error("Sudah ada pesanan. Jalankan `npm run db:reset` dulu.");
  await demo();
  await dummy();
  const count = (table: Parameters<typeof db.$count>[0]) => db.$count(table);
  console.log(`Seed selesai: ${await count(users)} pengguna, ${await count(orders)} pesanan, ${await count(expenses)} pengeluaran.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
