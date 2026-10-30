# Sak Karepe Website

Frontend etalase Sak Karepe, dibuat dengan Next.js App Router, TypeScript, dan Tailwind CSS v4. Semua foto, logo, katalog, dan font tersimpan di proyek ini.

## Pengembangan lokal

Gunakan Node.js 22.

```sh
npm ci
cp .env.example .env.local   # lalu isi nilainya
npm run db:migrate           # buat tabel di data/sakkarepe.db
npm run db:seed              # migrasi produk lama ke database (sekali saja)
npm run db:seed-regions      # unduh data wilayah Indonesia + kode pos (sekali saja)
npm run dev
```

Buka http://localhost:3000. Pemeriksaan dan build untuk server Next.js:

```sh
npm run lint
npm run build
npm start
```

## Preview frontend (GitHub Pages)

Branch `master` berisi aplikasi lengkap dengan fitur server (login, database, checkout, pembayaran) dan tidak di-deploy ke GitHub Pages. Preview frontend statis ada di branch `frontend-preview`, yang di-deploy otomatis ke https://sak-karepe.github.io/sak-karepe-website/ setiap kali di-push.

## Halaman dan konten

- `/`: beranda.
- `/koleksi`: grid semua produk dengan filter koleksi.
- `/koleksi/busana`, `/koleksi/tas`, `/koleksi/sepatu`, `/koleksi/kain`, `/koleksi/rumah`: pengantar koleksi dan daftar produknya.
- `/produk/[slug]`: detail produk dengan galeri foto, harga atau keterangan konsultasi, tombol **Beli sekarang** (lihat **Alur pembelian**), dan tombol tanya lewat WhatsApp.
- `/cerita`: perjalanan berdasarkan katalog Sak Karepe 2026.
- `/fashion-show`: slider dan arsip 12 foto panggung.
- `/kontak`: WhatsApp, alamat, dan peta.
- `/pesanan`: pesanan milik pembeli yang sedang masuk (menu akun → **Pesanan saya**). Detail `/pesanan/[kode]` menampilkan produk, total, alamat kirim, tombol **Lanjutkan checkout** saat status Menunggu checkout (atau link DOKU sebelumnya kedaluwarsa), tombol **Bayar sekarang** bila link DOKU masih berlaku, dan **Batalkan pesanan** selama belum dibayar (Menunggu konfirmasi, Menunggu checkout, atau Menunggu pembayaran). Link DOKU yang masih berlaku dibatalkan dulu lewat [Cancel Order API](https://developers.doku.com/accept-payments/doku-checkout/additional-feature/cancel-order-api); bila DOKU menolak, pesanan tidak dibatalkan. Fitur ini harus diaktifkan di DOKU Dashboard (Settings → Checkout Appearance → System Settings → Order Cancellation) dan hanya berlaku untuk Virtual Account (kecuali BTN, BNC, BPD, OCBC) dan QRIS. Pesanan akun lain menghasilkan 404.
- `/pesanan/[kode]/checkout`: link yang dikirim admin setelah harga disepakati. Pembeli (akun pemilik pesanan) memilih atau mengisi alamat, lalu memilih layanan kurir. Pilihan kurir dan ongkosnya diambil dari [Biteship Rates API](https://biteship.com/id/docs/api/rates/retrieve) (`src/lib/shipping.ts`) berdasarkan kode pos asal (`BITESHIP_ORIGIN_POSTAL_CODE`, default 60238), kode pos alamat, berat produk (kolom **Berat kemasan** di form produk; kosong dihitung 1.000 gram), dan harga kesepakatan. Hanya layanan paket dari kurir di `BITESHIP_COURIERS` yang ditampilkan, termurah lebih dulu, dan hasil yang sama disimpan 10 menit di memori karena setiap cek ongkir berbayar. **Lanjut ke pembayaran** menghitung ulang ongkir layanan yang dipilih di server, menyalin alamat dan kurir (`courier_code`, `courier_service_code`, `courier_name`) ke pesanan, membuat link [DOKU Checkout](https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration) yang berlaku 24 jam, mencatatnya di tabel `payments`, mengubah status menjadi Menunggu pembayaran, dan mengarahkan pembeli ke halaman DOKU. Bila link DOKU masih berlaku, halaman ini dialihkan ke detail pesanan.
- `/admin`: panel admin dengan layout sendiri (`src/app/admin/layout.tsx`), terpisah dari navbar dan footer website. Hanya untuk admin (lihat **Login**).

- `/admin/produk`: tambah, ubah, sembunyikan, dan hapus produk beserta fotonya.
- `/admin/pesanan`: daftar pesanan dengan filter status dan pencarian (angka saja = ID pesanan, selain itu potongan kode pesanan). Detail `/admin/pesanan/[id]` menampilkan produk, alamat kirim, catatan, akun pembeli (ID pembeli), tautan chat WhatsApp ke penerima, dan form untuk mengubah status.
  Setelah harga disepakati di WhatsApp, admin menekan **Buat link checkout**: modal berisi harga per produk saja (terisi dari katalog, bisa diubah hasil nego); ongkos kirim tidak diisi admin. Server menyimpan harga dan mengubah status menjadi Menunggu checkout, lalu modal menampilkan link `/pesanan/[kode]/checkout` dan pesan siap tempel untuk dikirim ke pembeli lewat WhatsApp. **Ubah harga** bisa dipakai selama belum dibayar; link DOKU yang masih berlaku dibatalkan dulu dan pembeli perlu checkout ulang. Butuh `DOKU_CLIENT_ID` (Client ID `BRN-...`, bukan API Key) dan `DOKU_SECRET_KEY`; `DOKU_ENV=production` untuk akun produksi. Status lunas otomatis lewat HTTP Notification DOKU ke `POST /api/doku/notification`: signature diverifikasi, notifikasi `SUCCESS` mengisi `payments.paid_at` dan `channel` lalu mengubah status pesanan menjadi Dibayar (notifikasi ganda diabaikan, `FAILED` diabaikan karena pembeli masih bisa ganti metode). Daftarkan `https://<domain>/api/doku/notification` sebagai Notification URL di DOKU Back Office untuk tiap metode pembayaran. Untuk pengembangan lokal, ekspos port 3000 lewat Cloudflare Tunnel atau localhost.run (DOKU tidak menerima domain ngrok).

Halaman publik berada di route group `src/app/(site)/` yang memakai `SiteShell`; URL-nya tidak berubah.

Koleksi dan produk disimpan di database (lihat bagian **Database dan produk**). `src/lib/content.ts` kini hanya berisi foto fashion show dan navigasi. Foto berbeda dapat memperlihatkan karya berbeda dalam satu koleksi, bukan selalu sudut lain dari produk yang sama. Harga, ukuran, bahan, dan ketersediaan belum dianggap terkonfirmasi.

Konsultasi dan pesanan membuka WhatsApp ke nomor di `NEXT_PUBLIC_WHATSAPP_NUMBER` (format `62...`). Bila kosong, dipakai 0857-3158-0488, nomor yang dikonfirmasi pengguna. Nilainya dibaca saat build, jadi build ulang setelah mengubahnya. Lokasi mengacu pada SLB Khusus Bina Mandiri dari tautan yang diberikan pengguna. Pencatatan pesanan sudah ada sampai pembeli diarahkan ke WhatsApp; admin lalu membuat link checkout, dan link pembayaran DOKU dibuat saat pembeli menyelesaikan checkout.

## Login

Tombol **Masuk** di navbar membuka modal login Google (Auth.js / `next-auth` v5). Semua akun Google dengan email terverifikasi boleh masuk sebagai pembeli dan kembali ke halaman tempat ia menekan **Masuk**. Saat login, akun disimpan di tabel `users`; `users.id` menjadi `session.user.id` sekaligus "ID pembeli". Dashboard `/admin` dan menu "Dashboard admin" hanya untuk admin:

- **Admin utama**: email di `ADMIN_EMAILS`. Selalu admin apa pun isi `users.role`-nya (role-nya tidak ditulis ke database), jadi instalasi baru tidak terkunci dan admin utama tidak bisa dicabut lewat dashboard/database. Mengganti admin utama berarti mengubah env dan restart server; email yang dihapus dari env langsung kehilangan akses.
- **Admin lain**: akun dengan `users.role = 'admin'` (default `pembeli`), tanpa perlu ada di env.

Role disimpan di token sesi hanya untuk menampilkan menu admin. `requireAdminPage()` dan `requireAdmin()` (`src/auth.ts`) selalu mengecek ulang role ke database, sehingga admin yang diturunkan ke pembeli langsung ditolak di halaman dan Server Action admin.

Salin `.env.example` ke `.env.local`, lalu isi nilainya. Di Google Cloud Console, buat OAuth Client ID bertipe *Web application* dengan authorized redirect URI `http://localhost:3000/api/auth/callback/google`, ditambah URI yang sama untuk domain produksi. Login butuh server Next.js, jadi tidak berjalan di build static export GitHub Pages.

## Alur pembelian

1. Pembeli membuka `/produk/[slug]` dan menekan **Beli sekarang** (disembunyikan bila stok 0).
2. Bila belum masuk, modal login terbuka. Login Google kembali ke `/produk/[slug]?beli=1`, lalu modal checkout langsung terbuka dan parameter `beli` dihapus dari URL.
3. Modal "Beli" berisi jumlah barang dan catatan opsional; alamat belum diminta.
4. **Pesan via WhatsApp** mencatat pesanan berstatus `menunggu_konfirmasi`, lalu membuka WhatsApp Sak Karepe dengan pesan berisi produk, jumlah, kode pesanan (mis. `SK-261023-7K2P`), dan ID pembeli.
5. Harga disepakati di WhatsApp. Admin mengisi harga produk di halaman pesanan dan membuat link checkout (status `menunggu_checkout`), lalu mengirim link itu ke pembeli.
6. Di `/pesanan/[kode]/checkout` pembeli memilih alamat atau menambah alamat baru. Provinsi, kota/kabupaten, kecamatan, dan kelurahan/desa dipilih bertingkat dari tabel `regions` (lewat `GET /api/regions?parent=<kode>`), dan kode pos terisi otomatis dari kelurahan/desa (masih bisa diubah). Pembeli memilih kurir dari daftar ongkir Biteship, lalu link DOKU dibuat dan pembeli diarahkan ke pembayaran (status `menunggu_pembayaran`).
7. Pembeli memantau status dari `/pesanan` dan bisa membatalkan selama belum dibayar. Stok belum dikurangi saat pesanan dicatat.

Kode ada di `src/components/buy-button.tsx`, `src/components/checkout.tsx` (modal beli dan pemilih alamat), `src/components/order-checkout.tsx`, `src/app/(site)/pesanan/[code]/checkout/page.tsx`, `src/lib/checkout-actions.ts`, dan `src/lib/shipping.ts`.

Animasi dan autoplay menghormati preferensi reduced motion. Preview foto mendukung keyboard dan mengembalikan fokus ketika ditutup.

## Database dan produk

Database memakai SQLite (libSQL) dengan Drizzle ORM. Skema ada di `src/db/schema.ts`, sedangkan migrasi SQL di `drizzle/`.

- `categories`: koleksi etalase (busana, tas, sepatu, kain, rumah), lengkap dengan teks halaman dan foto utama.
- `products`: item produk dalam satu koleksi. Harga dan stok opsional; harga kosong berarti dibicarakan lewat konsultasi. `slug` unik menjadi permalink `/produk/[slug]`. Slug dibuat dari nama saat produk dibuat dan tidak ikut berubah saat nama diganti, agar tautan yang sudah dibagikan tetap berlaku. Admin bisa mengubahnya sendiri.
- `product_images`: foto produk beserta teks alternatif dan urutannya.
- `users`: akun yang pernah login Google (email unik).
- `regions`: wilayah administrasi Indonesia sesuai Kepmendagri No 300.2.2-2430 Tahun 2025, dari provinsi sampai kelurahan/desa, beserta kode pos per kelurahan/desa. Sumber datanya [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) dan [cahyadsn/wilayah_kodepos](https://github.com/cahyadsn/wilayah_kodepos) (MIT), dikunci ke commit tertentu di `src/db/seed-regions.ts`. Isi dengan `npm run db:seed-regions`; tambahkan `-- --force` untuk mengisi ulang.
- `addresses`: alamat pengiriman milik pembeli. Nama wilayah disalin dari `regions` berdasarkan kode kelurahan/desa yang dipilih.
- `orders` dan `order_items`: pesanan dari tombol **Beli sekarang**. Nama penerima, alamat, nama produk, dan harga disalin saat memesan agar pesanan tidak berubah bila alamat atau produk diedit. Saat admin membuat pembayaran, harga item dan `shipping_cost` diganti dengan hasil kesepakatan.
- `payments`: link DOKU Checkout per pesanan (`invoice_number` unik: kode pesanan tanpa tanda hubung + `P1`, `P2`, ...). Membuat link baru menambah baris; yang terbaru yang berlaku. `paid_at` dan `channel` diisi dari notifikasi DOKU. `request_id` (Request-Id saat membuat link) dipakai untuk Cancel Order API; `cancelled_at` diisi setelah DOKU menerima pembatalan.

Produk tampil di website bila dicentang "Tampilkan di website" dan punya minimal satu foto. Setiap perubahan dari admin memperbarui halaman publik lewat `revalidatePath`.

`npm run db:seed` memindahkan data etalase lama ke database: setiap foto galeri lama menjadi satu produk, dengan nama awal dari deskripsi fotonya. Seed dilewati bila kategori sudah terisi. Setelah mengubah skema, jalankan `npm run db:generate` lalu `npm run db:migrate`. `npm run db:studio` membuka penjelajah database.

Foto unggahan disimpan di `storage/uploads` (bisa diubah lewat `UPLOAD_DIR`) dan dilayani lewat route `/uploads/[file]`, karena `next start` tidak melayani file yang ditambahkan ke `public/` setelah build. Folder `data/` dan `storage/` tidak masuk git, jadi keduanya perlu disimpan di disk persisten dan dicadangkan di server.
