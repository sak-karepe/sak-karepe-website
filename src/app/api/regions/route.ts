import { asc, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { regions } from "@/db/schema";

export type RegionOption = { code: string; name: string; postalCode: string | null };

/** Wilayah turunan `?parent=35.78` (kecamatan di Kota Surabaya); tanpa parent berisi daftar provinsi. */
export async function GET(request: NextRequest) {
  const parent = request.nextUrl.searchParams.get("parent");
  const options: RegionOption[] = await db
    .select({ code: regions.code, name: regions.name, postalCode: regions.postalCode })
    .from(regions)
    .where(parent ? eq(regions.parentCode, parent) : isNull(regions.parentCode))
    .orderBy(asc(regions.name));
  // Data wilayah jarang berubah; boleh disimpan browser sehari.
  return Response.json(options, { headers: { "Cache-Control": "public, max-age=86400" } });
}
