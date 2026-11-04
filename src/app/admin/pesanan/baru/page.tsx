import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { requireAdminPage } from "@/auth";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import { AdminBack } from "@/components/admin-back";
import { DirectSaleForm } from "./direct-sale-form";

export const metadata: Metadata = { title: "Catat Penjualan Langsung" };

export default async function NewDirectSalePage() {
  await requireAdminPage();

  const [productList, userList] = await Promise.all([
    db
      .select({
        id: products.id,
        name: products.name,
        price: products.price,
        stock: products.stock,
      })
      .from(products)
      .where(eq(products.published, true)),
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users),
  ]);

  return (
    <main id="utama" className="px-5 py-8 md:px-10 md:py-12">
      <AdminBack />
      <h1 className="mt-4 mb-8 text-3xl tracking-[-.045em] md:text-4xl">
        Catat Penjualan Langsung
      </h1>
      <DirectSaleForm productsList={productList} usersList={userList} />
    </main>
  );
}