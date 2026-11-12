import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export const databaseUrl = process.env.DATABASE_URL || "file:./data/sakkarepe.db";

export const db = drizzle(createClient({ url: databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN }), {
  schema,
});

// SQLite lokal: tiap transaksi memakai koneksi sendiri dengan BEGIN IMMEDIATE, jadi dua transaksi bersamaan (mis. job
// otomatis saat server start) langsung gagal SQLITE_BUSY. busy_timeout tidak menolong karena menunggunya memblokir
// thread Node, sehingga transaksi pemegang kunci tak bisa commit. Maka transaksi dalam proses ini diantrekan.
// shortcut: tulisan tunggal di luar transaksi dan proses lain (db:migrate, db:studio) masih bisa kena SQLITE_BUSY;
// pindah ke antrean di level client bila itu mulai sering terjadi.
if (databaseUrl.startsWith("file:")) {
  const transaction = db.transaction.bind(db);
  let last: Promise<unknown> = Promise.resolve();
  db.transaction = ((...args: Parameters<typeof transaction>) => {
    const run = last.then(() => transaction(...args));
    last = run.catch(() => {});
    return run;
  }) as typeof db.transaction;
}
