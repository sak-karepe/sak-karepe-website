"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isRootAdmin, requireAdmin } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { grantAdmin, revokeAdmin } from "@/lib/users";

export type AdminFormState = { error?: string; message?: string };

const done = (): AdminFormState => {
  revalidatePath("/admin/pengguna", "layout");
  return {};
};

/** Form "Tambah admin lewat email"; email yang belum pernah login dibuatkan akun dengan role admin. */
export async function addAdmin(_state: AdminFormState, formData: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const email = String(formData.get("email") ?? "").trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Tulis alamat email yang valid." };
  await grantAdmin(email);
  done();
  // Akun lama bisa ada di halaman lain daftar, jadi berhasil ditandai dengan pesan.
  return { message: `${email.toLowerCase()} sekarang admin.` };
}

export async function makeAdmin(id: number): Promise<AdminFormState> {
  await requireAdmin();
  const user = await db.query.users.findFirst({ columns: { email: true }, where: eq(users.id, id) });
  if (!user) return { error: "Pengguna tidak ditemukan." };
  await grantAdmin(user.email);
  return done();
}

export async function removeAdmin(id: number): Promise<AdminFormState> {
  const admin = await requireAdmin();
  const user = await db.query.users.findFirst({ columns: { email: true }, where: eq(users.id, id) });
  if (!user) return { error: "Pengguna tidak ditemukan." };
  if (isRootAdmin(user.email)) return { error: "Admin bawaan (ADMIN_EMAILS) tidak bisa dicabut dari dashboard." };
  if (id === Number(admin.id)) return { error: "Kamu tidak bisa mencabut akses admin milikmu sendiri." };
  if (!(await revokeAdmin(id, { id: Number(admin.id), root: isRootAdmin(admin.email) })))
    return { error: "Akses admin tidak dicabut. Muat ulang halaman untuk melihat role terbaru." };
  return done();
}
