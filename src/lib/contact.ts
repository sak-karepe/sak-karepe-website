/**
 * Nomor WhatsApp penjual dari NEXT_PUBLIC_WHATSAPP_NUMBER (format 62..., boleh ditulis 08... atau +62 ...).
 * Default: nomor yang dikonfirmasi pengguna, agar build tanpa .env (mis. GitHub Pages) tetap punya tujuan.
 */
const whatsapp = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "6285731580488").replace(/\D/g, "").replace(/^0/, "62");
/** 6285731580488 menjadi 0857-3158-0488 untuk ditampilkan. */
const phone = `0${whatsapp.slice(2)}`.replace(/^(\d{4})(\d{4})(\d+)$/, "$1-$2-$3");

// Lokasi dari tautan Google yang diberikan pengguna.
export const contact = {
  phone,
  whatsapp,
  location: "SLB Khusus Bina Mandiri",
  address:
    "Jl. Jemursari XVII No. E1, Jemur Wonosari, Kec. Wonocolo, Surabaya, Jawa Timur 60238",
  maps: "https://share.google/ebg7RfgE78FuInTF2",
  embed:
    "https://maps.google.com/maps?q=SLB%20KHUSUS%20BINA%20MANDIRI%20Jl.%20Jemursari%20XVII%20Surabaya&z=16&output=embed",
};
export const whatsappUrl = (
  message = "Halo Sak Karepe, saya ingin berkonsultasi tentang produk ecoprint.",
) => `https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(message)}`;
