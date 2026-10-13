import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { redirect } from "next/navigation";

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
    signIn: ({ profile }) => Boolean(profile?.email_verified) && isAdmin(profile?.email),
  },
});
