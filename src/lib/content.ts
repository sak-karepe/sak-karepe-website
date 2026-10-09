export const runwayPhotos = [
  {
    src: "/images/runway/f1259bd9-49f6-49be-b657-f84de04c4a80.jpeg",
    alt: "Busana hijau kekuningan dan tas bermotif daun.",
  },
  {
    src: "/images/runway/7914d1c2-1f23-4ae6-af8f-c9017e6a8a0b.jpeg",
    alt: "Busana ecoprint bernuansa gelap dengan tas.",
  },
  {
    src: "/images/runway/f3a33e32-4cd1-4e59-9858-bd306a88462c.jpeg",
    alt: "Busana bermotif daun merah muda.",
  },
  {
    src: "/images/runway/a9d6a262-62d5-4a55-bf3d-49cf616cf917.jpeg",
    alt: "Perpaduan motif daun dan detail batik pada busana.",
  },
  {
    src: "/images/runway/0c4cec6c-dfdc-4a9d-823e-158517a8041e.jpeg",
    alt: "Busana bermotif daun dengan kombinasi garis.",
  },
  {
    src: "/images/runway/23e07e7b-faa9-470b-91b4-10b8dccb12bc.jpeg",
    alt: "Busana biru gelap dipadukan dengan luaran bermotif daun.",
  },
  {
    src: "/images/runway/411fa43d-31c6-45e8-ae0e-ee782b8b926b.jpeg",
    alt: "Dress panjang bernuansa alami dengan motif daun.",
  },
  {
    src: "/images/runway/626dc30b-fb49-4491-b424-177914a54971.jpeg",
    alt: "Busana biru gelap dalam dokumentasi fashion show.",
  },
  {
    src: "/images/runway/76e7b072-10ac-49da-9a8c-47ceb7187ad1.jpeg",
    alt: "Dress panjang bermotif daun di panggung dengan latar tanaman.",
  },
  {
    src: "/images/runway/8a672849-8119-4b5d-9aa4-181c2a4badf5.jpeg",
    alt: "Busana dan luaran ecoprint bernuansa hijau.",
  },
  {
    src: "/images/runway/ac8c207d-3ad3-4ffc-9660-d6beaa4e6380.jpeg",
    alt: "Busana ecoprint dengan rok asimetris.",
  },
  {
    src: "/images/runway/b7e84e8d-1c76-43d4-80ca-f0bb01c88714.jpeg",
    alt: "Atasan bermotif daun dan celana berwarna terang.",
  },
];
export type Product = {
  category: string;
  title: string;
  subtitle: string;
  /** Foto utama untuk kartu etalase. Foto pendukung ada di collectionDetails.photos. */
  src: string;
  description: string;
};
export const products: Product[] = [
  {
    category: "busana",
    title: "Busana",
    subtitle: "Ecoprint bertemu batik",
    src: "/images/runway/a9d6a262-62d5-4a55-bf3d-49cf616cf917.jpeg",
    description:
      "Koleksi busana Sak Karepe mempertemukan ecoprint dengan batik. Foto ini menampilkan salah satu busana di panggung fashion.",
  },
  {
    category: "tas",
    title: "Tas",
    subtitle: "Jejak daun untuk keseharian",
    src: "/images/products/4568830f-1ef5-4a13-818b-333ebe618d49.jpeg",
    description:
      "Tote bag dengan motif jejak daun hijau dan kuning pada kain berwarna terang.",
  },
  {
    category: "sepatu",
    title: "Sepatu",
    subtitle: "Motif dalam setiap langkah",
    src: "/images/products/4a8c0d65-a166-4e34-9844-3b682a3f7878.jpeg",
    description: "Sepatu slip-on dengan motif urat daun hitam dan putih.",
  },
  {
    category: "kain",
    title: "Kain",
    subtitle: "Warna dan bentuk dari alam",
    src: "/images/products/8804e501-4559-4aa9-9848-df5476f1c64d.jpeg",
    description:
      "Kain bermotif daun hijau dan ungu dengan tepi lurik bergaris.",
  },
  {
    category: "rumah",
    title: "Rumah",
    subtitle: "Daun dalam keseharian",
    src: "/images/products/c262c573-badf-4f69-a5ba-68ec232fdfbb.jpeg",
    description: "Ragam cangkir dengan motif daun bernuansa cokelat.",
  },
];
export const navigation = [
  { href: "/koleksi", label: "Koleksi" },
  { href: "/fashion-show", label: "Fashion show" },
  { href: "/cerita", label: "Cerita kami" },
  { href: "/kontak", label: "Kontak" },
];
