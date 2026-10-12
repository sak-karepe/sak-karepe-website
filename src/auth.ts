import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/** Hanya email di ADMIN_EMAILS (dipisah koma) yang boleh masuk dashboard. */
export function isAdmin(email?: string | null) {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "").split(",").map((item) => item.trim().toLowerCase());
  return admins.includes(email.toLowerCase());
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
