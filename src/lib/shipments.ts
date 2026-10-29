import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import type { Shipment } from "@/lib/shipping";

/** Pemesanan kurir gagal sebelum paket diambil; resi dilepas agar admin bisa memesan kurir lagi. */
const failedStatuses = ["cancelled", "rejected", "courier_not_found"];
/** Paket dikembalikan kurir: pesanan "gagal_kirim" sampai admin mengirim ulang atau refund. */
export const returnedStatuses = ["return_in_transit", "returned"];
/** Pesanan yang sampai otomatis selesai bila pembeli tidak mengonfirmasi dalam 2 hari. */
export const autoCompleteMs = 2 * 24 * 60 * 60 * 1000;
/** Paket "on_hold" selama ini ditandai di dashboard admin untuk dicek. */
export const onHoldMs = 3 * 24 * 60 * 60 * 1000;

/**
 * Menyalin status, resi, dan link lacak Biteship ke pesanan "dikirim". Status pesanan hanya maju (dikirim -> sampai atau
 * gagal_kirim), jadi notifikasi yang datang terlambat atau berulang tidak menimpa status yang sudah diubah admin atau
 * pembeli. Pesanan "gagal_kirim" hanya menerima status pengembalian (return_in_transit -> returned), tidak pernah "sampai".
 */
export async function applyShipment(shipment: Shipment) {
  const returned = returnedStatuses.includes(shipment.status);
  const where = and(
    eq(orders.shipmentId, shipment.id),
    returned ? inArray(orders.status, ["dikirim", "gagal_kirim"]) : eq(orders.status, "dikirim"),
  );
  const now = new Date();
  if (failedStatuses.includes(shipment.status))
    await db
      .update(orders)
      .set({ status: "dibayar", shipmentId: null, shipmentStatus: null, waybillId: null, trackingUrl: null, collectionMethod: null, updatedAt: now })
      .where(where);
  else
    await db
      .update(orders)
      .set({
        shipmentStatus: shipment.status,
        ...(shipment.waybillId && { waybillId: shipment.waybillId }),
        ...(shipment.trackingUrl && { trackingUrl: shipment.trackingUrl }),
        ...(shipment.status === "delivered" && { status: "sampai", deliveredAt: now }),
        ...(returned && { status: "gagal_kirim", ...(shipment.note && { shipmentNote: shipment.note }) }),
        updatedAt: now,
      })
      .where(where);
}

export const completeDeliveredOrders = (now = new Date()) =>
  db
    .update(orders)
    .set({ status: "selesai", updatedAt: now })
    .where(and(eq(orders.status, "sampai"), lte(orders.deliveredAt, new Date(now.getTime() - autoCompleteMs))))
    .returning({ id: orders.id });

/**
 * Pesanan yang paketnya tertahan kurir terlalu lama.
 * shortcut: memakai updatedAt (webhook terakhir) sebagai awal on_hold; tambah kolom waktu status bila Biteship mengirim
 * webhook on_hold berulang sehingga penanda tidak pernah muncul.
 */
export const stuckOnHoldOrders = (now = new Date()) =>
  db.query.orders.findMany({
    columns: { id: true, code: true, updatedAt: true },
    where: and(eq(orders.status, "dikirim"), eq(orders.shipmentStatus, "on_hold"), lte(orders.updatedAt, new Date(now.getTime() - onHoldMs))),
    orderBy: orders.updatedAt,
  });
