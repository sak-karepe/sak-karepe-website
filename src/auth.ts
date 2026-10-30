import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    /** `id` berisi users.id (sebagai string, mengikuti tipe Auth.js). */
    user: { id: string; isAdmin: boolean } & DefaultSession["user"];
  }
}

/**
 * Admin utama: email di ADMIN_EMAILS (dipisah koma). Selalu admin walau role di database diubah,
 * agar tidak terkunci di instalasi baru dan tidak bisa dicabut dari dashboard.
 */
export function isRootAdmin(email?: string | null) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

/** Admin utama, atau role admin di database (dibaca ulang supaya admin yang dicabut langsung kehilangan akses). */
export async function isAdmin(user: { id: string; email?: string | null }) {
  if (isRootAdmin(user.email)) return true;
  const row = await db.query.users.findFirst({ columns: { role: true }, where: eq(users.id, Number(user.id)) });
  return row?.role === "admin";
}

async function currentAdmin() {
  const user = (await auth())?.user;
  return user && (await isAdmin(user)) ? user : null;
}

/** Untuk layout/halaman admin: pengunjung tanpa sesi admin dikembalikan ke beranda. */
export async function requireAdminPage() {
  const user = await currentAdmin();
  if (!user) redirect("/?error=SessionRequired");
  return user;
}

/** Untuk Server Action admin: layout/halaman sudah dicek, tapi action bisa dipanggil langsung. */
export async function requireAdmin() {
  const user = await currentAdmin();
  if (!user) throw new Error("Tidak diizinkan.");
  return user;
}

/** Untuk Server Action pembeli: id (users.id) dari sesi, atau null bila belum masuk. */
export async function currentUserId() {
  const id = Number((await auth())?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Simpan/perbarui akun di tabel users dan kembalikan id serta role-nya. Role admin utama sengaja tidak ditulis,
 * supaya menghapus email dari ADMIN_EMAILS langsung mencabut aksesnya.
 */
async function upsertUser(email: string, name?: string | null, image?: string | null) {
  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase(), name, image })
    .onConflictDoUpdate({ target: users.email, set: { name, image } })
    .returning({ id: users.id, role: users.role });
  return user;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  // Error login (mis. AccessDenied) kembali ke beranda dan dibuka di modal masuk.
  pages: { signIn: "/", error: "/" },
  callbacks: {
    // Semua akun Google terverifikasi boleh masuk sebagai pembeli; akses admin dicek terpisah.
    signIn: ({ profile }) => Boolean(profile?.email_verified),
    async jwt({ token, profile }) {
      // Saat login, atau sesi lama yang dibuat sebelum ada tabel users/kolom role.
      // Role di token hanya untuk tampilan (menu admin); akses admin dicek ulang ke database.
      if (token.email && (profile || typeof token.uid !== "number" || !token.role)) {
        const user = await upsertUser(token.email, token.name, token.picture);
        token.uid = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid);
      session.user.isAdmin = token.role === "admin" || isRootAdmin(session.user.email);
      return session;
    },
  },
});
