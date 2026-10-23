# Sak Karepe Website

Frontend etalase Sak Karepe, dibuat dengan Next.js App Router, TypeScript, dan Tailwind CSS v4. Semua foto, logo, katalog, dan font tersimpan di proyek ini.

## Pengembangan lokal

Gunakan Node.js 22.

```sh
npm ci
npm run dev
```

Buka http://localhost:3000. Pemeriksaan dan build untuk server Next.js:

```sh
npm run lint
npm run build
npm start
```

## Deploy GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` berjalan otomatis setiap push ke `master`, atau secara manual melalui tab Actions. Workflow memasang dependency dengan `npm ci`, menjalankan lint, menghasilkan frontend statis, lalu deploy folder `out` ke GitHub Pages.

Alamat website: https://sak-karepe.github.io/sak-karepe-website/

Pengaturan repository Pages menggunakan sumber **GitHub Actions**. Deployment memakai environment `github-pages`, izin `pages: write` dan `id-token: write`; tidak membutuhkan token pribadi atau secrets tambahan.

Untuk memeriksa build Pages di lokal:

```sh
GITHUB_PAGES=true NEXT_PUBLIC_BASE_PATH=/sak-karepe-website npm run build
```

`GITHUB_PAGES=true` mengaktifkan static export, trailing slash, dan gambar tanpa server optimasi. `NEXT_PUBLIC_BASE_PATH` memberi prefix pada route, gambar, logo, favicon, dan katalog. Workflow mengambil prefix ini dari metadata GitHub Pages. Pengembangan lokal tetap memakai route tanpa prefix.

## Halaman dan konten

- `/`: beranda.
- `/koleksi`: satu foto featured untuk setiap koleksi.
- `/koleksi/busana`, `/koleksi/tas`, `/koleksi/sepatu`, `/koleksi/kain`, `/koleksi/rumah`: detail koleksi dan galeri foto pendukung.
- `/cerita`: perjalanan berdasarkan katalog Sak Karepe 2026.
- `/fashion-show`: slider dan arsip 12 foto panggung.
- `/kontak`: WhatsApp, alamat, dan peta.
- `/admin`: dashboard admin, hanya untuk email di `ADMIN_EMAILS`.

`src/lib/content.ts` menentukan foto featured di etalase. `src/lib/collection-details.ts` menyimpan foto pendukung detail. Foto berbeda dapat memperlihatkan karya berbeda dalam satu koleksi, bukan selalu sudut lain dari produk yang sama. Harga, ukuran, bahan, dan ketersediaan belum dianggap terkonfirmasi.

Konsultasi membuka WhatsApp ke 0857-3158-0488, nomor yang dikonfirmasi pengguna. Lokasi mengacu pada SLB Khusus Bina Mandiri dari tautan yang diberikan pengguna. Backend penjualan belum dibuat.

## Login admin

Tombol **Masuk** di navbar membuka modal login Google (Auth.js / `next-auth` v5). Setelah berhasil, admin diarahkan ke `/admin`. Akun Google yang emailnya tidak ada di `ADMIN_EMAILS` ditolak, dan pesan galatnya tampil di modal.

Salin `.env.example` ke `.env.local`, lalu isi nilainya. Di Google Cloud Console, buat OAuth Client ID bertipe *Web application* dengan authorized redirect URI `http://localhost:3000/api/auth/callback/google`, ditambah URI yang sama untuk domain produksi. Login butuh server Next.js, jadi tidak berjalan di build static export GitHub Pages.

Animasi dan autoplay menghormati preferensi reduced motion. Preview foto mendukung keyboard dan mengembalikan fokus ketika ditutup.
