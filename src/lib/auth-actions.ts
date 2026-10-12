"use server";
import { signIn, signOut } from "@/auth";

/** `redirectTo` dari form login: halaman tempat pengguna menekan "Masuk", termasuk langkah checkout berikutnya. */
export async function signInWithGoogle(formData: FormData) {
  const target = String(formData.get("redirectTo") ?? "");
  // Hanya path internal, bukan URL luar atau "//host".
  const redirectTo = target.startsWith("/") && !target.startsWith("//") ? target : "/";
  await signIn("google", { redirectTo });
}

export async function signOutAdmin() {
  await signOut({ redirectTo: "/" });
}
