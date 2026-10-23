import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const addresses = sqliteTable("addresses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  /** Jalan, nomor rumah, RT/RW, kelurahan. */
  street: text("street").notNull(),
  district: text("district").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
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
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
