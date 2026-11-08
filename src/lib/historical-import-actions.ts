"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { cancelHistoricalImport, previewHistoricalImport, saveHistoricalImport } from "@/lib/historical-import";

export async function previewHistoricalCsv(csv: string) {
  await requireAdmin();
  return previewHistoricalImport(db, csv);
}

export async function importHistoricalCsv(csv: string) {
  const admin = await requireAdmin();
  const result = await saveHistoricalImport(db, csv, Number(admin.id));
  revalidatePath("/admin", "layout");
  return result;
}

export async function undoHistoricalImport(batchId: string) {
  await requireAdmin();
  if (typeof batchId !== "string" || !/^[\da-f-]{36}$/.test(batchId)) return { error: "Batch import tidak valid." };
  const deleted = await cancelHistoricalImport(db, batchId);
  revalidatePath("/admin", "layout");
  return deleted ? {} : { error: "Batch ini sudah dibatalkan atau tidak ditemukan." };
}
