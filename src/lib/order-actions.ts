"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { isOrderStatus } from "@/lib/order-status";

export async function updateOrderStatus(id: number, formData: FormData) {
  await requireAdmin();
  const status = formData.get("status");
  if (!isOrderStatus(status)) return;
  await db.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id));
  revalidatePath("/admin", "layout");
}
