import { assetPath } from "@/lib/assets";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteShell } from "@/components/site-shell";
const display = localFont({
  src: "./fonts/space-grotesk-bold.ttf",
  variable: "--font-display",
  weight: "700",
  display: "swap",
});
const body = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans.ttf", weight: "400" },
    { path: "./fonts/ibm-plex-sans-medium.ttf", weight: "500" },
  ],
  variable: "--font-body",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Sak Karepe · Pewarnaan Alami",
  description:
    "Ecoprint, batik, dan tenun Sak Karepe. Jelajahi koleksi, fashion show, dan perjalanan berkarya dari SLB Khusus Bina Mandiri.",
  icons: { icon: assetPath("/brand/logo.svg") },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${display.variable} ${body.variable} antialiased`}
    >
      <body>
        <SiteShell>{children}</SiteShell>
      </body>
    </html>
  );
}
