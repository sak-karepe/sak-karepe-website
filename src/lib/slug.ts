import { and, eq, like, or, type SQL } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { db } from "../db";
import { sanitizeSlugInput } from "./format";

export { sanitizeSlugInput };

/** "Tote Bag, Daun Jati!" menjadi "tote-bag-daun-jati". */
export function slugify(value: string) {
  return sanitizeSlugInput(value).replace(/-+$/g, "") || "produk";
}

/** Slug dari `input`, diberi akhiran -2, -3, ... bila sudah dipakai baris lain. `exclude` menyaring baris yang sedang diubah. */
export async function uniqueSlug(column: SQLiteColumn, input: string, exclude?: SQL) {
  const base = slugify(input);
  const rows = await db
    .select({ slug: column })
    .from(column.table)
    .where(and(or(eq(column, base), like(column, `${base}-%`)), exclude));
  const taken = new Set(rows.map((row) => row.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}
