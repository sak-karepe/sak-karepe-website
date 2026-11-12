import { sql, type AnyColumn } from "drizzle-orm";

/** Batas hasil pencarian dropdown: cukup untuk dipilih, ringan untuk client. */
export const searchLimit = 50;

/** Pola LIKE "mengandung"; % dan _ dari pengguna dicocokkan apa adanya, bukan sebagai wildcard. */
export function containsPattern(query: string) {
  return `%${query.trim().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Kondisi `kolom mengandung query` (tanpa membedakan huruf besar/kecil), atau undefined bila query kosong. */
export function contains(column: AnyColumn, query: string | null | undefined) {
  return query?.trim() ? sql`${column} like ${containsPattern(query)} escape '\\'` : undefined;
}
