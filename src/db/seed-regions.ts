/**
 * Mengisi tabel regions dengan wilayah administrasi Indonesia (provinsi sampai kelurahan/desa) beserta kode pos.
 * Sumber: github.com/cahyadsn/wilayah (Kepmendagri No 300.2.2-2430 Tahun 2025) dan github.com/cahyadsn/wilayah_kodepos,
 * keduanya berlisensi MIT, dikunci ke commit tertentu agar hasilnya bisa diulang.
 * Jalankan setelah `npm run db:migrate`: `npm run db:seed-regions`. Dilewati bila tabel sudah terisi;
 * tambahkan `-- --force` untuk mengganti isinya dengan data terbaru dari commit di bawah.
 */
import { count } from "drizzle-orm";
import { db } from "./index";
import { regions } from "./schema";

const wilayahUrl = "https://raw.githubusercontent.com/cahyadsn/wilayah/a2d86cbd5c8c53c29d97459f02335898e2770217/db/wilayah.sql";
const kodeposUrl =
  "https://raw.githubusercontent.com/cahyadsn/wilayah_kodepos/ba8497156c5cc9bcbfc527f7b8875d403eda2354/db/wilayah_kodepos.sql";

async function download(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Gagal mengunduh ${url}: ${response.status}`);
  return response.text();
}

/** Baris `('35.78.08.1001','Gubeng')` dari dump SQL; tanda petik ganda '' menjadi '. */
function tuples(sql: string) {
  return [...sql.matchAll(/\('([\d.]+)',\s*'((?:[^']|'')*)'\)/g)].map(([, code, value]) => [code, value.replaceAll("''", "'")] as const);
}

async function main() {
  const force = process.argv.includes("--force");
  const [{ total }] = await db.select({ total: count() }).from(regions);
  if (total > 0 && !force) {
    console.log(`Tabel regions sudah berisi ${total} wilayah, seed dilewati. Pakai --force untuk mengisi ulang.`);
    return;
  }
  console.log("Mengunduh data wilayah dan kode pos…");
  const [wilayah, kodepos] = await Promise.all([download(wilayahUrl), download(kodeposUrl)]);
  const postalCodes = new Map(tuples(kodepos));
  const rows = tuples(wilayah).map(([code, name]) => {
    const parts = code.split(".");
    return {
      code,
      parentCode: parts.length > 1 ? parts.slice(0, -1).join(".") : null,
      level: parts.length,
      name,
      postalCode: postalCodes.get(code) ?? null,
    };
  });
  await db.transaction(async (tx) => {
    await tx.delete(regions);
    for (let start = 0; start < rows.length; start += 1000) await tx.insert(regions).values(rows.slice(start, start + 1000));
  });
  const levels = [1, 2, 3, 4].map((level) => rows.filter((row) => row.level === level).length);
  console.log(`Selesai: ${levels[0]} provinsi, ${levels[1]} kab/kota, ${levels[2]} kecamatan, ${levels[3]} kelurahan/desa.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
