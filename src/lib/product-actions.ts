"use server";
import { and, eq, like, max, ne, notInArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";
import { parseAmount } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { checkUpload, removeUpload, saveUpload } from "@/lib/uploads";

export type ProductFormState = { error?: string };


/** Slug dari form (atau dari nama bila kosong), diberi akhiran -2, -3, ... bila sudah dipakai produk lain. */
async function uniqueSlug(input: string, excludeId?: number) {
  const base = slugify(input);
  const taken = new Set(
    (
      await db
        .select({ slug: products.slug })
        .from(products)
        .where(and(or(eq(products.slug, base), like(products.slug, `${base}-%`)), excludeId ? ne(products.id, excludeId) : undefined))
    ).map((row) => row.slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

async function readForm(formData: FormData, excludeId?: number) {
  const name = String(formData.get("name") ?? "").trim();
  const categorySlug = String(formData.get("categorySlug") ?? "");
  const files = formData.getAll("newImages").filter((file): file is File => file instanceof File && file.size > 0);
  if (!name) return { error: "Nama produk wajib diisi." } as const;
  const category = await db.query.categories.findFirst({ where: eq(categories.slug, categorySlug) });
  if (!category) return { error: "Pilih koleksi produk." } as const;
  const uploadError = files.map(checkUpload).find(Boolean);
  if (uploadError) return { error: uploadError } as const;
  return {
    files,
    values: {
      name,
      slug: await uniqueSlug(String(formData.get("slug") ?? "").trim() || name, excludeId),
      categorySlug,
      description: String(formData.get("description") ?? "").trim(),
      price: parseAmount(formData.get("price")),
      stock: parseAmount(formData.get("stock")),
      weight: parseAmount(formData.get("weight")),
      published: formData.get("published") === "on",
    },
  } as const;
}

/** Foto baru ditaruh setelah foto lama; alt default memakai nama produk. */
async function addImages(productId: number, files: File[], alt: string, startOrder: number) {
  for (const [index, file] of files.entries()) {
    await db.insert(productImages).values({ productId, src: await saveUpload(file), alt, sortOrder: startOrder + index });
  }
}

function refreshCatalog() {
  revalidatePath("/", "layout");
}

export async function createProduct(_state: ProductFormState, formData: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const form = await readForm(formData);
  if ("error" in form) return { error: form.error };
  const [{ last }] = await db
    .select({ last: max(products.sortOrder) })
    .from(products)
    .where(eq(products.categorySlug, form.values.categorySlug));
  const [product] = await db
    .insert(products)
    .values({ ...form.values, sortOrder: (last ?? -1) + 1 })
    .returning({ id: products.id });
  await addImages(product.id, form.files, form.values.name, 0);
  refreshCatalog();
  redirect("/admin/produk");
}

export async function updateProduct(
  id: number,
  _state: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const form = await readForm(formData, id);
  if ("error" in form) return { error: form.error };
  // Urutan input imageId mengikuti urutan foto di form.
  const keptIds = formData.getAll("imageId").map(Number);
  const removed = await db
    .select()
    .from(productImages)
    .where(and(eq(productImages.productId, id), notInArray(productImages.id, keptIds.length ? keptIds : [-1])));
  await db.transaction(async (tx) => {
    await tx.update(products).set({ ...form.values, updatedAt: new Date() }).where(eq(products.id, id));
    for (const image of removed) await tx.delete(productImages).where(eq(productImages.id, image.id));
    for (const [index, imageId] of keptIds.entries()) {
      const alt = String(formData.get(`alt-${imageId}`) ?? "").trim() || form.values.name;
      await tx
        .update(productImages)
        .set({ alt, sortOrder: index })
        .where(and(eq(productImages.id, imageId), eq(productImages.productId, id)));
    }
  });
  await Promise.all(removed.map((image) => removeUpload(image.src)));
  await addImages(id, form.files, form.values.name, keptIds.length);
  refreshCatalog();
  redirect("/admin/produk");
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  const images = await db.select().from(productImages).where(eq(productImages.productId, id));
  await db.transaction(async (tx) => {
    await tx.delete(productImages).where(eq(productImages.productId, id));
    await tx.delete(products).where(eq(products.id, id));
  });
  await Promise.all(images.map((image) => removeUpload(image.src)));
  refreshCatalog();
  redirect("/admin/produk");
}
