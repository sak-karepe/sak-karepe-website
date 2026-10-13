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

export const productsRelations = relations(products, ({ many, one }) => ({
  images: many(productImages),
  category: one(categories, { fields: [products.categorySlug], references: [categories.slug] }),
}));
export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export type Category =typeof categories.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
