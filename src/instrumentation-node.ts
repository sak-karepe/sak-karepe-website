import { setDefaultAutoSelectFamilyAttemptTimeout } from "node:net";

// Node memutus tiap percobaan koneksi setelah 250 ms. Di jaringan lambat atau tanpa IPv6, fetch ke Google (tukar kode login)
// gagal dengan ETIMEDOUT padahal servernya bisa dijangkau.
setDefaultAutoSelectFamilyAttemptTimeout(2000);

let maintenanceQueue = Promise.resolve();

function scheduleMaintenance(name: string, job: () => Promise<void>) {
  maintenanceQueue = maintenanceQueue
    .then(job)
    .catch((error) => console.warn(`[maintenance] Gagal menjalankan ${name}`, error));
}

// Pesanan "sampai" yang tidak dikonfirmasi pembeli selama 2 hari menjadi "selesai"; dicek tiap jam selama server hidup.
async function completeOrders() {
  const { completeDeliveredOrders } = await import("@/lib/shipments");
  const done = await completeDeliveredOrders().catch((error) => console.warn("[pesanan] Gagal menyelesaikan otomatis", error));
  if (done?.length) console.info(`[pesanan] ${done.length} pesanan otomatis selesai`);
}
scheduleMaintenance("penyelesaian pesanan", completeOrders);
setInterval(() => scheduleMaintenance("penyelesaian pesanan", completeOrders), 60 * 60 * 1000).unref();

// Pesanan belum dibayar yang kedaluwarsa dibatalkan (lib/payments); dicek tiap jam.
async function cancelOrders() {
  const { cancelExpiredOrders } = await import("@/lib/payments");
  const cancelled = await cancelExpiredOrders().catch((error) => console.warn("[pesanan] Gagal membatalkan otomatis", error));
  if (cancelled?.length) console.info(`[pesanan] ${cancelled.length} pesanan kedaluwarsa otomatis dibatalkan`);
}
scheduleMaintenance("pembatalan pesanan", cancelOrders);
setInterval(() => scheduleMaintenance("pembatalan pesanan", cancelOrders), 60 * 60 * 1000).unref();

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
scheduleMaintenance("rekonsiliasi pembayaran", reconcilePayments);
scheduleMaintenance("rekonsiliasi pengiriman", reconcileShipments);
setInterval(() => scheduleMaintenance("rekonsiliasi pembayaran", reconcilePayments), 15 * 60 * 1000).unref();
setInterval(() => scheduleMaintenance("rekonsiliasi pengiriman", reconcileShipments), 60 * 60 * 1000).unref();
