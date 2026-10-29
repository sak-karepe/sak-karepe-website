import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";

// Node memutus tiap percobaan koneksi setelah 250 ms. Di jaringan lambat atau tanpa IPv6, fetch ke Google (tukar kode login)
// gagal dengan ETIMEDOUT padahal servernya bisa dijangkau.
setDefaultAutoSelectFamilyAttemptTimeout(2000);

// Pesanan "sampai" yang tidak dikonfirmasi pembeli selama 2 hari menjadi "selesai"; dicek tiap jam selama server hidup.
async function completeOrders() {
  const { completeDeliveredOrders } = await import("@/lib/shipments");
  const done = await completeDeliveredOrders().catch((error) => console.warn("[pesanan] Gagal menyelesaikan otomatis", error));
  if (done?.length) console.info(`[pesanan] ${done.length} pesanan otomatis selesai`);
}
void completeOrders();
setInterval(completeOrders, 60 * 60 * 1000).unref();
