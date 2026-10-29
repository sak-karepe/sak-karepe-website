import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Koleksi di etalase (busana, tas, ...). Slug dipakai di URL /koleksi/[slug]. */
export const categories = sqliteTable("categories", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  description: text("description").notNull(),
  intro: text("intro").notNull(),
  character: text("character").notNull(),
  /** Foto utama kartu etalase. */
  coverImage: text("cover_image").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categorySlug: text("category_slug")
    .notNull()
    .references(() => categories.slug, { onUpdate: "cascade" }),
  name: text("name").notNull(),
  /** Permalink /produk/[slug]. Tidak ikut berubah saat nama diganti agar tautan lama tetap jalan. */
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  /** Rupiah. Kosong berarti harga dibicarakan lewat konsultasi. */
  price: integer("price"),
  stock: integer("stock"),
  /** Berat kemasan dalam gram untuk cek ongkir Biteship; kosong memakai berat default (lib/shipping). */
  weight: integer("weight"),
  published: integer("published", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const productImages = sqliteTable("product_images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  src: text("src").notNull(),
  alt: text("alt").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

/** Akun pembeli/admin dari login Google. `id` inilah "ID pembeli" yang dikirim ke WhatsApp. */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name"),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

/**
 * Wilayah administrasi Indonesia (Kepmendagri 2025, dataset cahyadsn/wilayah), diisi `npm run db:seed-regions`.
 * Kode bertingkat: "35" provinsi, "35.78" kab/kota, "35.78.08" kecamatan, "35.78.08.1001" kelurahan/desa.
 */
export const regions = sqliteTable(
  "regions",
  {
    code: text("code").primaryKey(),
    /** Kode wilayah induk; kosong untuk provinsi. */
    parentCode: text("parent_code"),
    /** 1 provinsi, 2 kab/kota, 3 kecamatan, 4 kelurahan/desa. */
    level: integer("level").notNull(),
    name: text("name").notNull(),
    /** Hanya kelurahan/desa. */
    postalCode: text("postal_code"),
  },
  (table) => [index("regions_parent_idx").on(table.parentCode)],
);

export const addresses = sqliteTable("addresses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  /** Jalan, nomor rumah, RT/RW. */
  street: text("street").notNull(),
  /** Nama wilayah disalin dari tabel regions berdasarkan `villageCode`. */
  village: text("village").notNull().default(""),
  district: text("district").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  /** Kode kelurahan/desa di tabel regions; kosong untuk alamat lama yang diketik manual. */
  villageCode: text("village_code"),
  postalCode: text("postal_code").notNull(),
  /** Patokan atau catatan untuk kurir. */
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

/**
 * Status awal "menunggu_konfirmasi": harga masih dibicarakan lewat WhatsApp. Setelah admin mengisi harga dan membuat
 * link checkout menjadi "menunggu_checkout"; pembeli mengisi alamat di halaman checkout, lalu link DOKU dibuat
 * dan status menjadi "menunggu_pembayaran". Setelah dibayar admin memesan kurir (resi) dan status menjadi "dikirim"; detail
 * perjalanannya ada di `shipmentStatus`. Webhook Biteship mengubahnya menjadi "sampai", lalu "selesai" saat pembeli
 * mengonfirmasi atau 2 hari kemudian. Paket yang dikembalikan kurir menjadi "gagal_kirim", lalu dikirim ulang atau refund.
 * Aturan perpindahan status ada di lib/order-status (`orderTransitions`).
 */
export const orderStatuses = [
  "menunggu_konfirmasi",
  "menunggu_checkout",
  "menunggu_pembayaran",
  "dibayar",
  "dikirim",
  "gagal_kirim",
  "sampai",
  "retur",
  "selesai",
  "refund",
  "dibatalkan",
] as const;

/** "online" dari website, "langsung" dicatat admin saat jualan offline, "historis" impor transaksi lama. */
export const orderSources = ["online", "langsung", "historis"] as const;

export const orders = sqliteTable(
  "orders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Kode yang dikutip pembeli di WhatsApp, mis. SK-261023-7K2P. */
    code: text("code").notNull().unique(),
    source: text("source", { enum: orderSources }).notNull().default("online"),
    /** Kosong untuk pembeli tanpa akun (transaksi langsung/historis); identitasnya di `customerName`/`customerPhone`. */
    userId: integer("user_id").references(() => users.id),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    /** Admin yang mencatat transaksi langsung/historis. */
    recordedBy: integer("recorded_by").references(() => users.id),
    /** Nomor nota/referensi lama; unik per sumber agar import tidak ganda. */
    externalRef: text("external_ref"),
    status: text("status", { enum: orderStatuses }).notNull().default("menunggu_konfirmasi"),
    // Salinan alamat saat pembeli checkout, agar pesanan tidak berubah bila alamat diedit/dihapus. Kosong sebelum checkout.
    recipientName: text("recipient_name"),
    phone: text("phone"),
    shippingAddress: text("shipping_address"),
    postalCode: text("postal_code"),
    /** Jumlah harga katalog; kosong bila ada produk dengan harga konsultasi. */
    subtotal: integer("subtotal"),
    /** Dihitung saat pembeli checkout berdasarkan alamat dan layanan kurir pilihannya (lihat lib/shipping). */
    shippingCost: integer("shipping_cost"),
    /** Kode kurir dan layanan Biteship pilihan pembeli, mis. "jnt" + "ez"; dipakai saat booking pengiriman. */
    courierCode: text("courier_code"),
    courierServiceCode: text("courier_service_code"),
    /** Nama untuk ditampilkan, mis. "J&T EZ". */
    courierName: text("courier_name"),
    /** ID order Biteship dari pemesanan kurir oleh admin; dipakai webhook untuk mencocokkan pesanan. */
    shipmentId: text("shipment_id").unique(),
    /** Status order Biteship apa adanya, mis. "confirmed", "picked", "dropping_off"; label di lib/order-status. */
    shipmentStatus: text("shipment_status"),
    /** Halaman lacak dari Biteship (courier.link). */
    trackingUrl: text("tracking_url"),
    /** Nomor resi; beberapa kurir baru memberinya setelah paket diambil (webhook order.waybill_id). */
    waybillId: text("waybill_id"),
    /** "pickup" (kurir menjemput) atau "drop_off" (admin mengantar ke agen kurir). */
    collectionMethod: text("collection_method", { enum: ["pickup", "drop_off"] }),
    /** Kapan kurir melaporkan paket sampai; 2 hari kemudian pesanan otomatis selesai. */
    deliveredAt: integer("delivered_at", { mode: "timestamp" }),
    /** Catatan kurir terakhir saat paket dikembalikan ("gagal_kirim"), mis. alamat tidak ditemukan. */
    shipmentNote: text("shipment_note"),
    /** Alasan pesanan ditandai "Perlu dicek" di dashboard admin, mis. nominal DOKU tidak cocok; dikosongkan admin. */
    reviewNote: text("review_note"),
    notes: text("notes").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex("orders_source_external_ref_unique").on(table.source, table.externalRef)],
);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, { onDelete: "set null" }),
  /** Nama dan harga disalin saat memesan. */
  productName: text("product_name").notNull(),
  price: integer("price"),
  quantity: integer("quantity").notNull(),
});

export const paymentMethods = ["doku", "tunai", "transfer", "qris", "lainnya"] as const;

/**
 * Link pembayaran DOKU Checkout, atau pembayaran manual yang dicatat admin (method selain "doku", langsung berisi `paidAt`).
 * Membuat ulang link DOKU menambah baris baru; yang terbaru yang berlaku.
 */
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  method: text("method", { enum: paymentMethods }).notNull().default("doku"),
  /** order.invoice_number di DOKU, unik per permintaan: kode pesanan + nomor urut, mis. SK261023Y7D3P1. Kosong untuk non-DOKU. */
  invoiceNumber: text("invoice_number").unique(),
  amount: integer("amount").notNull(),
  /** Link dan batas bayar DOKU; kosong untuk non-DOKU. */
  url: text("url"),
  expiresAt: integer("expires_at", { mode: "timestamp" }),
  /** Diisi dari HTTP Notification DOKU berstatus SUCCESS. */
  paidAt: integer("paid_at", { mode: "timestamp" }),
  /** channel.id dari DOKU, mis. QRIS_DOKU atau VIRTUAL_ACCOUNT_BCA. */
  channel: text("channel"),
  /** Request-Id saat membuat link; wajib untuk Cancel Order API (payment.original_request_id). */
  requestId: text("request_id"),
  /** Diisi setelah DOKU menerima pembatalan link. */
  cancelledAt: integer("cancelled_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

/** Resi lama yang gagal kirim, disimpan saat admin mengirim ulang; resi yang berlaku tetap di `orders`. */
export const shipmentHistory = sqliteTable("shipment_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  shipmentId: text("shipment_id").notNull(),
  waybillId: text("waybill_id"),
  courierName: text("courier_name"),
  /** Status order Biteship terakhir, mis. "returned". */
  shipmentStatus: text("shipment_status"),
  note: text("note"),
  /** Siapa yang menanggung ongkir pengiriman ulang setelah resi ini. */
  resendPaidBy: text("resend_paid_by", { enum: ["pembeli", "sak_karepe"] }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const productsRelations = relations(products, ({ many, one }) => ({
  images: many(productImages),
  category: one(categories, { fields: [products.categorySlug], references: [categories.slug] }),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(addresses),
  orders: many(orders),
}));
export const addressesRelations = relations(addresses, ({ one }) => ({
  user: one(users, { fields: [addresses.userId], references: [users.id] }),
}));
export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  payments: many(payments),
  shipmentHistory: many(shipmentHistory),
}));
export const shipmentHistoryRelations = relations(shipmentHistory, ({ one }) => ({
  order: one(orders, { fields: [shipmentHistory.orderId], references: [orders.id] }),
}));
export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));
export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export type Category = typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type User = typeof users.$inferSelect;
export type Address = typeof addresses.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ShipmentHistory = typeof shipmentHistory.$inferSelect;
