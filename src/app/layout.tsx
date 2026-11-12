import { assetPath } from "@/lib/assets";
import { displayKey } from "@/lib/content";
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
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
// Hanya diunduh saat pengunjung memilih font disleksia.
const dyslexic = localFont({
  src: [
    { path: "./fonts/opendyslexic-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/opendyslexic-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-dyslexic",
  display: "swap",
  preload: false,
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "http://localhost:3000"),
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
      className={`${display.variable} ${body.variable} ${dyslexic.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Terapkan pengaturan tampilan sebelum render pertama supaya tidak berkedip. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=JSON.parse(localStorage.getItem(${JSON.stringify(displayKey)})||"{}");for(var k in d)if(d[k])document.documentElement.dataset[k]=d[k]}catch(e){}})()`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
