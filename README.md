# Sak Karepe Website

Frontend etalase Sak Karepe, dibuat dengan Next.js App Router, TypeScript, dan Tailwind CSS v4. Semua foto, logo, katalog, dan font tersimpan di proyek ini.

## Pengembangan lokal

Gunakan Node.js 22.

```sh
npm ci
cp .env.example .env.local   # lalu isi nilainya
npm run db:migrate           # buat tabel di data/sakkarepe.db
npm run db:seed              # migrasi produk lama ke database (sekali saja)
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
- `/koleksi`: grid semua produk dengan filter koleksi.
- `/koleksi/busana`, `/koleksi/tas`, `/koleksi/sepatu`, `/koleksi/kain`, `/koleksi/rumah`: pengantar koleksi dan daftar produknya.
- `/produk/[slug]`: detail produk dengan galeri foto, harga atau keterangan konsultasi, tombol **Beli sekarang** (lihat **Alur pembelian**), dan tombol tanya lewat WhatsApp.
- `/cerita`: perjalanan berdasarkan katalog Sak Karepe 2026.
- `/fashion-show`: slider dan arsip 12 foto panggung.
- `/kontak`: WhatsApp, alamat, dan peta.
- `/admin`: panel admin dengan layout sendiri (`src/app/admin/layout.tsx`), terpisah dari navbar dan footer website. Hanya untuk email di `ADMIN_EMAILS`.

- `/admin/produk`: tambah, ubah, sembunyikan, dan hapus produk beserta fotonya.

Halaman publik berada di route group `src/app/(site)/` yang memakai `SiteShell`; URL-nya tidak berubah.

Koleksi dan produk disimpan di database (lihat bagian **Database dan produk**). `src/lib/content.ts` kini hanya berisi foto fashion show dan navigasi. Foto berbeda dapat memperlihatkan karya berbeda dalam satu koleksi, bukan selalu sudut lain dari produk yang sama. Harga, ukuran, bahan, dan ketersediaan belum dianggap terkonfirmasi.

Konsultasi membuka WhatsApp ke 0857-3158-0488, nomor yang dikonfirmasi pengguna. Lokasi mengacu pada SLB Khusus Bina Mandiri dari tautan yang diberikan pengguna. Pencatatan pesanan sudah ada sampai pembeli diarahkan ke WhatsApp; pembayaran belum dibuat.

## Login

Tombol **Masuk** di navbar membuka modal login Google (Auth.js / `next-auth` v5). Semua akun Google dengan email terverifikasi boleh masuk sebagai pembeli dan kembali ke halaman tempat ia menekan **Masuk**. Saat login, akun disimpan di tabel `users`; `users.id` menjadi `session.user.id` sekaligus "ID pembeli". Dashboard `/admin` dan menu "Dashboard admin" hanya untuk email di `ADMIN_EMAILS`.

Salin `.env.example` ke `.env.local`, lalu isi nilainya. Di Google Cloud Console, buat OAuth Client ID bertipe *Web application* dengan authorized redirect URI `http://localhost:3000/api/auth/callback/google`, ditambah URI yang sama untuk domain produksi. Login butuh server Next.js, jadi tidak berjalan di build static export GitHub Pages.

## Alur pembelian

1. Pembeli membuka `/produk/[slug]` dan menekan **Beli sekarang** (disembunyikan bila stok 0).
2. Bila belum masuk, modal login terbuka. Login Google kembali ke `/produk/[slug]?beli=1`, lalu modal checkout langsung terbuka dan parameter `beli` dihapus dari URL.
3. Modal checkout berisi jumlah barang dan pilihan alamat. Bila pembeli belum punya alamat, form alamat tampil lebih dulu; alamat baru bisa ditambah kapan saja.
4. **Pesan lewat WhatsApp** mencatat pesanan berstatus `menunggu_konfirmasi`, lalu membuka WhatsApp Sak Karepe dengan pesan berisi produk, jumlah, kode pesanan (mis. `SK-261023-7K2P`), ID pembeli, dan alamat.
5. Harga akhir, ongkir, dan pembayaran disepakati di WhatsApp. Pembuatan tagihan oleh penjual berdasarkan ID pembeli/kode pesanan belum dibuat; stok juga belum dikurangi saat pesanan dicatat.

Kode ada di `src/components/buy-button.tsx`, `src/components/checkout.tsx`, dan `src/lib/checkout-actions.ts`.

Animasi dan autoplay menghormati preferensi reduced motion. Preview foto mendukung keyboard dan mengembalikan fokus ketika ditutup.

## Database dan produk

Database memakai SQLite (libSQL) dengan Drizzle ORM. Skema ada di `src/db/schema.ts`, sedangkan migrasi SQL di `drizzle/`.

- `categories`: koleksi etalase (busana, tas, sepatu, kain, rumah), lengkap dengan teks halaman dan foto utama.
- `products`: item produk dalam satu koleksi. Harga dan stok opsional; harga kosong berarti dibicarakan lewat konsultasi. `slug` unik menjadi permalink `/produk/[slug]`. Slug dibuat dari nama saat produk dibuat dan tidak ikut berubah saat nama diganti, agar tautan yang sudah dibagikan tetap berlaku. Admin bisa mengubahnya sendiri.
- `product_images`: foto produk beserta teks alternatif dan urutannya.
- `users`: akun yang pernah login Google (email unik).
- `addresses`: alamat pengiriman milik pembeli.
- `orders` dan `order_items`: pesanan dari tombol **Beli sekarang**. Nama penerima, alamat, nama produk, dan harga disalin saat memesan agar pesanan tidak berubah bila alamat atau produk diedit.

Produk tampil di website bila dicentang "Tampilkan di website" dan punya minimal satu foto. Setiap perubahan dari admin memperbarui halaman publik lewat `revalidatePath`.

`npm run db:seed` memindahkan data etalase lama ke database: setiap foto galeri lama menjadi satu produk, dengan nama awal dari deskripsi fotonya. Seed dilewati bila kategori sudah terisi. Setelah mengubah skema, jalankan `npm run db:generate` lalu `npm run db:migrate`. `npm run db:studio` membuka penjelajah database.

Foto unggahan disimpan di `storage/uploads` (bisa diubah lewat `UPLOAD_DIR`) dan dilayani lewat route `/uploads/[file]`, karena `next start` tidak melayani file yang ditambahkan ke `public/` setelah build. Folder `data/` dan `storage/` tidak masuk git, jadi keduanya perlu disimpan di disk persisten dan dicadangkan di server.
