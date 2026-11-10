import { desc } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { parseOrderFilter } from "@/lib/order-filter";
import { ordersToXlsx } from "@/lib/orders-xlsx";

export const dynamic = "force-dynamic";

/**
 * Export pesanan ke Excel (.xlsx) mengikuti filter yang sama dengan daftar /admin/pesanan (status, q) serta sumber, dari,
 * sampai, dan tanpaBatal bila diberikan. Hanya admin; selain itu 401.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return new Response("Akses ditolak.", { status: 401 });
  }
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filter = parseOrderFilter(params);
  const rows = await db.query.orders.findMany({
    where: filter.where,
    orderBy: [desc(orders.createdAt), desc(orders.id)],
    with: {
      user: { columns: { name: true, email: true } },
      items: { columns: { productName: true, quantity: true } },
      payments: { columns: { method: true, channel: true, paidAt: true } },
    },
  });
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  const name = ["pesanan", today, filter.status].filter(Boolean).join("-");
  return new Response(new Uint8Array(ordersToXlsx(rows)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}