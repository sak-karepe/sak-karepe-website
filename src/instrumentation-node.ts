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

// Webhook DOKU/Biteship bisa tidak sampai (server mati, timeout); status dicek ulang langsung ke API-nya.
// Pembayaran tiap 15 menit agar tercatat < 1 jam, pengiriman tiap jam.
async function reconcilePayments() {
  const { reconcilePayments } = await import("@/lib/payments");
  const failed = await reconcilePayments().catch((error) => console.warn("[doku] Rekonsiliasi pembayaran gagal", error));
  if (failed) console.warn(`[doku] ${failed} link pembayaran gagal dicek ke DOKU`);
}
async function reconcileShipments() {
  const { reconcileShipments } = await import("@/lib/shipments");
  const failed = await reconcileShipments().catch((error) => console.warn("[biteship] Rekonsiliasi pengiriman gagal", error));
  if (failed) console.warn(`[biteship] ${failed} pengiriman gagal dicek ke Biteship`);
}
void reconcilePayments();
void reconcileShipments();
setInterval(reconcilePayments, 15 * 60 * 1000).unref();
setInterval(reconcileShipments, 60 * 60 * 1000).unref();
