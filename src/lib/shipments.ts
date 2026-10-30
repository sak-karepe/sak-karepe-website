import { and, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { orderEvents, orders, shipmentHistory, type Order, type ShipmentHistory } from "@/db/schema";
import { getShipment, type CollectionMethod, type Shipment } from "@/lib/shipping";

/** Pemesanan kurir gagal sebelum paket diambil; resi dilepas agar admin bisa memesan kurir lagi. */
const failedStatuses = ["cancelled", "rejected", "courier_not_found"];
/** Paket dikembalikan kurir: pesanan "gagal_kirim" sampai admin mengirim ulang atau refund. */
export const returnedStatuses = ["return_in_transit", "returned"];
/** Pesanan yang sampai otomatis selesai bila pembeli tidak mengonfirmasi dalam 2 hari. */
export const autoCompleteMs = 2 * 24 * 60 * 60 * 1000;
/** Paket "on_hold" selama ini ditandai di dashboard admin untuk dicek. */
export const onHoldMs = 3 * 24 * 60 * 60 * 1000;
/** Pesanan "dikirim" yang tidak berubah selama ini dicek ulang ke Biteship, bila webhook tidak sampai. */
export const staleShipmentMs = 6 * 60 * 60 * 1000;

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
  const toStatus = failedStatuses.includes(shipment.status)
    ? "dibayar"
    : shipment.status === "delivered"
      ? "sampai"
      : returned
        ? "gagal_kirim"
        : null;
  await db.transaction(async (tx) => {
    // Status lama dibaca untuk riwayat; "gagal_kirim" yang menerima "returned" tidak dicatat sebagai perubahan.
    const before = await tx.query.orders.findFirst({ columns: { id: true, status: true }, where });
    if (!before) return;
    if (toStatus === "dibayar")
      await tx
        .update(orders)
        .set({ status: "dibayar", shipmentId: null, shipmentStatus: null, waybillId: null, trackingUrl: null, collectionMethod: null, updatedAt: now })
        .where(where);
    else
      await tx
        .update(orders)
        .set({
          shipmentStatus: shipment.status,
          ...(shipment.waybillId && { waybillId: shipment.waybillId }),
          ...(shipment.trackingUrl && { trackingUrl: shipment.trackingUrl }),
          ...(toStatus === "sampai" && { status: "sampai", deliveredAt: now }),
          ...(returned && { status: "gagal_kirim", ...(shipment.note && { shipmentNote: shipment.note }) }),
          updatedAt: now,
        })
        .where(where);
    if (toStatus && toStatus !== before.status)
      await tx.insert(orderEvents).values({
        orderId: before.id,
        fromStatus: before.status,
        toStatus,
        source: "biteship",
        note: [shipment.status, shipment.note].filter(Boolean).join(" · "),
      });
  });
}

/**
 * Menyimpan booking kirim ulang: alamat dan resi baru ke pesanan "gagal_kirim", resi lama ke `shipmentHistory`.
 * Mengembalikan undefined bila pesanan sudah berubah (mis. dikirim ulang dari tab lain).
 */
export const saveResend = (
  order: Order,
  address: Pick<Order, "recipientName" | "phone" | "shippingAddress" | "postalCode">,
  method: CollectionMethod,
  paidBy: ShipmentHistory["resendPaidBy"],
  shipment: Shipment,
  userId: number,
) =>
  db.transaction(async (tx) => {
    const [updated] = await tx
      .update(orders)
      .set({
        ...address,
        status: "dikirim",
        shipmentId: shipment.id,
        shipmentStatus: shipment.status,
        waybillId: shipment.waybillId,
        trackingUrl: shipment.trackingUrl,
        collectionMethod: method,
        shipmentNote: null,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.id, order.id), eq(orders.status, "gagal_kirim"), eq(orders.shipmentId, order.shipmentId!)))
      .returning({ id: orders.id });
    if (updated) {
      await tx.insert(orderEvents).values({ orderId: order.id, fromStatus: "gagal_kirim", toStatus: "dikirim", source: "admin", userId, note: "Kirim ulang" });
      await tx.insert(shipmentHistory).values({
        orderId: order.id,
        shipmentId: order.shipmentId!,
        waybillId: order.waybillId,
        courierName: order.courierName,
        shipmentStatus: order.shipmentStatus,
        note: order.shipmentNote,
        resendPaidBy: paidBy,
      });
    }
    return updated;
  });

export const completeDeliveredOrders = (now = new Date()) =>
  db.transaction(async (tx) => {
    const done = await tx
      .update(orders)
      .set({ status: "selesai", updatedAt: now })
      .where(and(eq(orders.status, "sampai"), lte(orders.deliveredAt, new Date(now.getTime() - autoCompleteMs))))
      .returning({ id: orders.id });
    if (done.length)
      await tx.insert(orderEvents).values(
        done.map(({ id }) => ({ orderId: id, fromStatus: "sampai" as const, toStatus: "selesai" as const, source: "sistem" as const, note: "Otomatis 2 hari setelah sampai" })),
      );
    return done;
  });

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

/**
 * Mengambil status terbaru dari Biteship dan menerapkannya hanya bila status atau resi berubah, agar `updatedAt` tetap
 * menandai awal on_hold (`stuckOnHoldOrders`).
 */
export async function refreshShipment(order: Pick<Order, "shipmentId" | "shipmentStatus" | "waybillId">) {
  const shipment = await getShipment(order.shipmentId!);
  if (shipment.ok && (shipment.status !== order.shipmentStatus || (shipment.waybillId && shipment.waybillId !== order.waybillId)))
    await applyShipment(shipment);
  return shipment;
}

/**
 * Mengecek ulang pesanan "dikirim" yang lama tidak berubah. Mengembalikan jumlah yang gagal dicek.
 * shortcut: pesanan yang memang lama di jalan dicek setiap kali job berjalan; batasi per pesanan bila jumlahnya membuat
 * kuota API Biteship terasa.
 */
export async function reconcileShipments(now = new Date()) {
  const stale = await db.query.orders.findMany({
    columns: { shipmentId: true, shipmentStatus: true, waybillId: true },
    where: and(eq(orders.status, "dikirim"), isNotNull(orders.shipmentId), lte(orders.updatedAt, new Date(now.getTime() - staleShipmentMs))),
  });
  let failed = 0;
  for (const order of stale) if (!(await refreshShipment(order)).ok) failed++;
  return failed;
}
