import { readFile } from "node:fs/promises";
import path from "node:path";
import { uploadDir, uploadTypes } from "@/lib/uploads";

const contentTypes = Object.fromEntries(Object.entries(uploadTypes).map(([type, ext]) => [ext, type]));

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const name = path.basename((await params).file);
  const type = contentTypes[path.extname(name).slice(1)];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(path.join(/*turbopackIgnore: true*/ uploadDir, name));
    // Nama file unik per unggahan, jadi aman di-cache lama.
    return new Response(body, {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
