import { and, eq, exists, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Mencabut role admin `targetId` oleh admin `by`. Admin tidak bisa mencabut dirinya, dan pencabut yang bukan admin
 * bawaan harus masih admin saat baris ditulis (dicek di query yang sama): dua admin yang saling mencabut bersamaan
 * tidak membuat situs tanpa admin. Mengembalikan false bila tidak ada yang dicabut.
 */
export async function revokeAdmin(targetId: number, by: { id: number; root: boolean }) {
  const revoker = db.select({ id: users.id }).from(users).where(and(eq(users.id, by.id), eq(users.role, "admin")));
  const [revoked] = await db
    .update(users)
    .set({ role: "pembeli" })
    .where(and(eq(users.id, targetId), eq(users.role, "admin"), ne(users.id, by.id), by.root ? undefined : exists(revoker)))
    .returning({ id: users.id });
  return !!revoked;
}

/** Menjadikan email admin; akun dibuat lebih dulu bila belum pernah login (upsert login tidak menimpa role). */
export const grantAdmin = (email: string) =>
  db.insert(users).values({ email: email.toLowerCase(), role: "admin" }).onConflictDoUpdate({ target: users.email, set: { role: "admin" } });
