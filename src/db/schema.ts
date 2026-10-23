import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

/** Status awal "menunggu_konfirmasi": harga/ongkir masih dibicarakan lewat WhatsApp. */
export const orderStatuses = ["menunggu_konfirmasi", "menunggu_pembayaran", "dibayar", "dikirim", "selesai", "dibatalkan"] as const;

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Kode yang dikutip pembeli di WhatsApp, mis. SK-261023-7K2P. */
  code: text("code").notNull().unique(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  status: text("status", { enum: orderStatuses }).notNull().default("menunggu_konfirmasi"),
  // Salinan alamat saat pesan dibuat, agar pesanan tidak berubah bila alamat diedit/dihapus.
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  postalCode: text("postal_code").notNull(),
  /** Jumlah harga katalog; kosong bila ada produk dengan harga konsultasi. */
  subtotal: integer("subtotal"),
  /** Diisi admin saat membuat pembayaran, bersama harga hasil kesepakatan. */
  shippingCost: integer("shipping_cost"),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

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

/** Link pembayaran DOKU Checkout. Membuat ulang link menambah baris baru; yang terbaru yang berlaku. */
export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  /** order.invoice_number di DOKU, unik per permintaan: kode pesanan + nomor urut, mis. SK261023Y7D3P1. */
  invoiceNumber: text("invoice_number").notNull().unique(),
  amount: integer("amount").notNull(),
  url: text("url").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
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
