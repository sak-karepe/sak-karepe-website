"use client";
import { ErrorMessage } from "@/components/error-message";
import "./globals.css";

/** Menggantikan root layout bila layout itu sendiri gagal, jadi harus membuat <html> dan <body> sendiri. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="id">
      <body>
        <title>Terjadi gangguan · Sak Karepe</title>
        <ErrorMessage error={error} retry={retry} />
      </body>
    </html>
  );
}
