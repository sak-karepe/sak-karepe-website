import { and, asc, eq, isNull } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { regions } from "@/db/schema";
import { contains, searchLimit } from "@/lib/search";

export type RegionOption = { value: string; label: string; postalCode: string | null };

/**
 * Wilayah turunan `?parent=35.78` (kecamatan di Kota Surabaya); tanpa parent berisi daftar provinsi.
 * `?q=` mencari nama di server dan hasilnya dibatasi, jadi tingkat dengan ribuan baris tetap ringan.
 */
export async function GET(request: NextRequest) {
  const parent = request.nextUrl.searchParams.get("parent");
  const query = request.nextUrl.searchParams.get("q");
  const options: RegionOption[] = await db
    .select({ value: regions.code, label: regions.name, postalCode: regions.postalCode })
    .from(regions)
    .where(and(parent ? eq(regions.parentCode, parent) : isNull(regions.parentCode), contains(regions.name, query)))
    .orderBy(asc(regions.name))
    .limit(searchLimit);
  // Data wilayah jarang berubah; boleh disimpan browser sehari.
  return Response.json(options, { headers: { "Cache-Control": "public, max-age=86400" } });
}
