"use server";

import { eq, max, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/auth";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { uniqueSlug } from "@/lib/slug";
import { checkUpload, removeUpload, saveUpload } from "@/lib/uploads";

export type CategoryFormState = { error?: string };

function parseSortOrder(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^-?\d+$/.test(raw)) return Number.NaN;
  return Number(raw);
}

async function readForm(formData: FormData, existing?: { slug: string; coverImage: string; sortOrder: number }) {
  const title = String(formData.get("title") ?? "").trim();
  const subtitle = String(formData.get("subtitle") ?? "").trim();
  const intro = String(formData.get("intro") ?? "").trim();
  const character = String(formData.get("character") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const sortOrderInput = parseSortOrder(formData.get("sortOrder"));
  const file = formData.get("coverImage");
  const uploadFile = file instanceof File && file.size > 0 ? file : null;

  if (!title) return { error: "Judul koleksi wajib diisi." } as const;
  if (!subtitle) return { error: "Subjudul koleksi wajib diisi." } as const;
  if (!intro) return { error: "Kalimat pembuka (intro) wajib diisi." } as const;
  if (!character) return { error: "Karakter koleksi wajib diisi." } as const;
  if (!description) return { error: "Deskripsi koleksi wajib diisi." } as const;
  if (Number.isNaN(sortOrderInput)) return { error: "Urutan tampil harus berupa angka bulat." } as const;
  if (!existing && !uploadFile) return { error: "Foto cover koleksi wajib diunggah." } as const;

  let coverImage = existing?.coverImage ?? "";
  if (uploadFile) {
    const uploadError = checkUpload(uploadFile);
    if (uploadError) return { error: uploadError } as const;
    try {
      coverImage = await saveUpload(uploadFile);
    } catch (error) {
      console.error("[upload] Foto cover koleksi gagal disimpan", error);
      return { error: "Foto cover belum bisa disimpan. Coba lagi sebentar." } as const;
    }
  }

  let sortOrder = sortOrderInput;
  if (sortOrder === null) {
    if (existing) {
      sortOrder = existing.sortOrder;
    } else {
      const [{ last }] = await db.select({ last: max(categories.sortOrder) }).from(categories);
      sortOrder = (last ?? -1) + 1;
    }
  }

  const slug = await uniqueSlug(
    categories.slug,
    rawSlug || title,
    existing ? ne(categories.slug, existing.slug) : undefined,
  );

  return {
    uploadedNewCover: Boolean(uploadFile),
    values: {
      slug,
      title,
      subtitle,
      intro,
      character,
      description,
      coverImage,
      sortOrder,
    },
  } as const;
}

export async function createCategory(_state: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  await requireAdmin();
  const form = await readForm(formData);
  if ("error" in form) return { error: form.error };

  await db.insert(categories).values(form.values);
  revalidatePath("/", "layout");
  redirect("/admin/koleksi");
}

export async function updateCategory(
  currentSlug: string,
  _state: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireAdmin();
  const existing = await db.query.categories.findFirst({ where: eq(categories.slug, currentSlug) });
  if (!existing) return { error: "Koleksi tidak ditemukan." };

  const form = await readForm(formData, existing);
  if ("error" in form) return { error: form.error };

  await db.update(categories).set(form.values).where(eq(categories.slug, currentSlug));

  if (form.uploadedNewCover && existing.coverImage !== form.values.coverImage) {
    await removeUpload(existing.coverImage);
  }

  revalidatePath("/", "layout");
  redirect("/admin/koleksi");
}

export async function deleteCategory(slug: string): Promise<CategoryFormState> {
  await requireAdmin();
  const existing = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  if (!existing) return { error: "Koleksi tidak ditemukan." };

  const productCount = await db.$count(products, eq(products.categorySlug, slug));
  if (productCount > 0) {
    return { error: `Koleksi "${existing.title}" masih berisi ${productCount} produk dan tidak bisa dihapus.` };
  }

  await db.delete(categories).where(eq(categories.slug, slug));
  await removeUpload(existing.coverImage);
  revalidatePath("/", "layout");
  redirect("/admin/koleksi");
}

