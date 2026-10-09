import { runwayPhotos } from "./content";
export const productImage = (name: string) => `/images/products/${name}.jpeg`;
export type CollectionDetail = {
  intro: string;
  character: string;
  photos: { src: string; alt: string }[];
};
export const collectionDetails: Record<string, CollectionDetail> = {
  tas: {
    intro: "Jejak daun yang ikut ke mana pun kamu pergi.",
    character:
      "Dari tote bag berbahan kain hingga tas dengan unsur anyaman, ecoprint memberi karakter berbeda pada setiap bentuk.",
    photos: [
      {
        src: productImage("4568830f-1ef5-4a13-818b-333ebe618d49"),
        alt: "Tote bag dengan jejak daun hijau dan kuning",
      },
      {
        src: productImage("998116ca-fc67-47d7-b96e-c1e5f22205fe"),
        alt: "Tas anyaman dengan panel ecoprint cokelat",
      },
      {
        src: productImage("193084ac-ee0b-4741-8f53-18729d7bce92"),
        alt: "Tote bag dengan susunan daun bernuansa cokelat",
      },
      { src: productImage("41b579e7-e0b6-40fa-83f1-1c8b20a08637"), alt: "Tas kecil dengan panel motif daun" },
      { src: productImage("fc3b844f-0fc0-4c90-af3d-95bb151e254b"), alt: "Tas kain dengan motif daun gelap" },
      { src: productImage("be65b46f-5521-4ef3-82b7-4d1446a7bff1"), alt: "Tas kain bermotif daun kuning dan cokelat" },
    ],
  },
  kain: {
    intro: "Satu bentang kain. Banyak kemungkinan.",
    character:
      "Bentuk daun dan warna alami bertemu pada kain. Beberapa karya dipadukan dengan tepi lurik bergaris.",
    photos: [
      {
        src: productImage("8804e501-4559-4aa9-9848-df5476f1c64d"),
        alt: "Kain bermotif daun hijau dan ungu dengan tepi lurik",
      },
      {
        src: productImage("3ff6a2dc-af7f-47d0-8014-986368cfbe6c"),
        alt: "Ragam kain bermotif daun dengan tepi bergaris",
      },
      { src: productImage("9b044280-5a93-412f-88b7-6f7b46af14ea"), alt: "Kain terang dengan jejak daun gelap" },
    ],
  },
  sepatu: {
    intro: "Motif daun, dalam setiap langkah.",
    character:
      "Sepatu slip-on ini menampilkan motif urat daun hitam dan putih. Pola alami memberi detail pada bentuk sepatu sehari-hari.",
    photos: [
      {
        src: productImage("4a8c0d65-a166-4e34-9844-3b682a3f7878"),
        alt: "Sepasang sepatu slip-on ecoprint bermotif urat daun",
      },
    ],
  },
  busana: {
    intro: "Ecoprint bertemu batik dan tenun.",
    character:
      "Koleksi busana mempertemukan motif daun dengan unsur batik, tenun ikat, dan lurik. Foto panggung memperlihatkan sebagian ragam karya Sak Karepe.",
    photos: [
      ...runwayPhotos,
      { src: productImage("e3934808-8be2-4305-bd7a-e22e08501ee8"), alt: "Busana panjang bermotif ecoprint dalam pameran" },
    ],
  },
  rumah: {
    intro: "Jejak daun di sudut rumah.",
    character: "Ragam cangkir bermotif daun melengkapi koleksi Sak Karepe.",
    photos: [
      { src: productImage("c262c573-badf-4f69-a5ba-68ec232fdfbb"), alt: "Cangkir dengan motif daun bernuansa cokelat" },
      { src: productImage("5a73e497-8ba2-4ca8-a99a-95750b9f204b"), alt: "Ragam cangkir dengan motif daun" },
    ],
  },
};
