import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";

declare module "next-auth" {
  interface Session {
    /** `id` berisi users.id (sebagai string, mengikuti tipe Auth.js). */
    user: { id: string; isAdmin: boolean } & DefaultSession["user"];
  }
}

/** Hanya email di ADMIN_EMAILS (dipisah koma) yang boleh masuk dashboard. */
export function isAdmin(email?: string | null) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
}

/** Untuk layout/halaman admin: pengunjung tanpa sesi admin dikembalikan ke beranda. */
export async function requireAdminPage() {
  const user = (await auth())?.user;
  if (!user || !isAdmin(user.email)) redirect("/?error=SessionRequired");
  return user;
}

/** Untuk Server Action admin: layout/halaman sudah dicek, tapi action bisa dipanggil langsung. */
export async function requireAdmin() {
  const user = (await auth())?.user;
  if (!user || !isAdmin(user.email)) throw new Error("Tidak diizinkan.");
  return user;
}

/** Untuk Server Action pembeli: id (users.id) dari sesi, atau null bila belum masuk. */
export async function currentUserId() {
  const id = Number((await auth())?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Simpan/perbarui akun di tabel users dan kembalikan id-nya. */
async function upsertUser(email: string, name?: string | null, image?: string | null) {
  const [user] = await db
    .insert(users)
    .values({ email: email.toLowerCase(), name, image })
    .onConflictDoUpdate({ target: users.email, set: { name, image } })
    .returning({ id: users.id });
  return user.id;
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
      // Saat login, atau sesi lama yang dibuat sebelum ada tabel users.
      if (token.email && (profile || typeof token.uid !== "number"))
        token.uid = await upsertUser(token.email, token.name, token.picture);
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.uid);
      session.user.isAdmin = isAdmin(session.user.email);
      return session;
    },
  },
});
