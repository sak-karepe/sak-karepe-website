import { and, eq, lte } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import type { Shipment } from "@/lib/shipping";

/** Pemesanan kurir gagal sebelum paket diambil; resi dilepas agar admin bisa memesan kurir lagi. */
const failedStatuses = ["cancelled", "rejected", "courier_not_found"];
/** Pesanan yang sampai otomatis selesai bila pembeli tidak mengonfirmasi dalam 2 hari. */
export const autoCompleteMs = 2 * 24 * 60 * 60 * 1000;

/**
 * Menyalin status, resi, dan link lacak Biteship ke pesanan "dikirim". Status pesanan hanya maju (dikirim -> sampai),
 * jadi notifikasi yang datang terlambat atau berulang tidak menimpa status yang sudah diubah admin atau pembeli.
 */
export async function applyShipment(shipment: Shipment) {
  const where = and(eq(orders.shipmentId, shipment.id), eq(orders.status, "dikirim"));
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
