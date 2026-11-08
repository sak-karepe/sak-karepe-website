// src/lib/page-blocks.ts
import { db } from "@/db";
import { pageBlocks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getBlockContent(keys: string[]): Promise<Record<string, string>> {
  try {
    const rows = await db.select().from(pageBlocks);
    const map: Record<string, string> = {};

    for (const row of rows) {
      if (keys.includes(row.key)) {
        map[row.key] = row.value;
      }
    }

    return map;
  } catch {
    return {};
  }
}

export async function getBlock(key: string, defaultValue: string): Promise<string> {
  try {
    const [row] = await db.select().from(pageBlocks).where(eq(pageBlocks.key, key)).limit(1);
    if (row && row.value.trim() !== "") {
      return row.value;
    }
  } catch {}
  return defaultValue;
}