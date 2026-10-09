// Lokasi dari tautan Google yang diberikan pengguna; WhatsApp dikonfirmasi pengguna.
export const contact = {
  phone: "0857-3158-0488",
  whatsapp: "6285731580488",
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
