"use client";
import { useSite } from "@/components/site-shell";

/** Membuka modal masuk; setelah login Google kembali ke `redirectTo`. */
export function LoginPrompt({ notice, redirectTo }: { notice: string; redirectTo: string }) {
  const { open } = useSite();
  return (
    <button className="btn" onClick={() => open({ kind: "login", notice, redirectTo })}>
      Masuk
    </button>
  );
}
