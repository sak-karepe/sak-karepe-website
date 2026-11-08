import { desc } from "drizzle-orm";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { parseOrderFilter } from "@/lib/order-filter";
import { ordersToCsv } from "@/lib/orders-csv";

export const dynamic = "force-dynamic";

/**
 * Export pesanan ke CSV mengikuti filter yang sama dengan daftar /admin/pesanan (status, q) serta sumber, dari, dan
 * sampai bila diberikan. Hanya admin; selain itu 401.
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
  return new Response(ordersToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}