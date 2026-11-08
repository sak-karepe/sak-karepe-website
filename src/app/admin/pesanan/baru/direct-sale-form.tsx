"use client";

import { useState } from "react";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { createDirectSale } from "@/lib/order-actions";

type ProductOption = {
  id: number;
  name: string;
  price: number | null;
  stock: number | null;
};

type UserOption = {
  id: number;
  name: string | null;
  email: string;
};

type ItemRow = {
  id: string;
  productId: number | null;
  productName: string;
  price: number;
  quantity: number;
};

export function DirectSaleForm({
  productsList,
  usersList,
}: {
  productsList: ProductOption[];
  usersList: UserOption[];
}) {
  const [customerType, setCustomerType] = useState<
    "general" | "manual" | "registered"
  >("general");
  const [isShipping, setIsShipping] = useState(false);
  const [items, setItems] = useState<ItemRow[]>([
    { id: "1", productId: null, productName: "", price: 0, quantity: 1 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        productId: null,
        productName: "",
        price: 0,
        quantity: 1,
      },
    ]);
  };

  const removeItemRow = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSelectProduct = (index: number, prodId: string) => {
    const selected = productsList.find((p) => p.id === Number(prodId));
    setItems((prev) => {
      const next = [...prev];
      if (selected) {
        next[index] = {
          ...next[index],
          productId: selected.id,
          productName: selected.name,
          price: selected.price || 0,
        };
      } else {
        next[index] = {
          ...next[index],
          productId: null,
          productName: "",
          price: 0,
        };
      }
      return next;
    });
  };

  const updateItem = (
    index: number,
    field: keyof ItemRow,
    value: string | number | null,
  ) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  async function handleSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const result = await createDirectSale({}, formData);
    if (result?.error) {
      setError(result.error);
      setPending(false);
    } else if (result?.redirectTo) {
      window.location.href = result.redirectTo;
    }
  }

  return (
    <form action={handleSubmit} className="space-y-8 max-w-3xl">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="customerType" value={customerType} />
      <input type="hidden" name="isShipping" value={String(isShipping)} />

      {error && (
        <div className="rounded-md border border-danger bg-danger/10 p-4 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Bagian 1: Item Penjualan */}
      <section className="space-y-4 rounded-lg border border-line p-5 bg-surface/40">
        <h2 className="text-lg font-medium">1. Item Penjualan</h2>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end border-b border-line pb-4"
            >
              <div className="sm:col-span-5">
                <label className="block text-xs text-muted mb-1">
                  Pilih Produk Katalog atau Item Bebas
                </label>
                <select
                  value={item.productId || ""}
                  onChange={(e) => handleSelectProduct(idx, e.target.value)}
                  className="w-full rounded border border-line bg-page px-2 py-1.5 text-sm"
                >
                  <option value="">-- Item Bebas / Custom --</option>
                  {productsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.stock !== null ? `(Stok: ${p.stock})` : ""}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nama produk/item"
                  value={item.productName}
                  onChange={(e) =>
                    updateItem(idx, "productName", e.target.value)
                  }
                  className="mt-1.5 w-full rounded border border-line bg-page px-2 py-1.5 text-sm"
                  required
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-xs text-muted mb-1">
                  Harga Satuan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={item.price}
                  onChange={(e) =>
                    updateItem(idx, "price", Number(e.target.value))
                  }
                  className="w-full rounded border border-line bg-page px-2 py-1.5 text-sm"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-muted mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) =>
                    updateItem(idx, "quantity", Number(e.target.value))
                  }
                  className="w-full rounded border border-line bg-page px-2 py-1.5 text-sm"
                  required
                />
              </div>

              <div className="sm:col-span-2 flex items-center justify-between">
                <span className="text-sm font-medium tabular-nums">
                  Rp {(item.price * item.quantity).toLocaleString("id-ID")}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItemRow(item.id)}
                    className="text-danger p-1 hover:opacity-80"
                  >
                    <TrashIcon size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button
            type="button"
            onClick={addItemRow}
            className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
          >
            <PlusIcon size={16} /> Tambah Item
          </button>
          <div className="text-right">
            <span className="text-sm text-muted">Total Subtotal: </span>
            <span className="text-lg font-bold">
              Rp {totalAmount.toLocaleString("id-ID")}
            </span>
          </div>
        </div>
      </section>

      {/* Bagian 2: Pembeli & Waktu Transaksi */}
      <section className="space-y-4 rounded-lg border border-line p-5 bg-surface/40">
        <h2 className="text-lg font-medium">2. Pembeli & Waktu Transaksi</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tipe Pembeli
            </label>
            <select
              value={customerType}
              onChange={(e) =>
                setCustomerType(
                  e.target.value as "general" | "manual" | "registered",
                )
              }
              className="w-full rounded border border-line bg-page px-3 py-2 text-sm"
            >
              <option value="general">Pembeli Umum</option>
              <option value="manual">Isi Nama & No. HP Manual</option>
              <option value="registered">Pilih Pengguna Terdaftar</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Tanggal Transaksi
            </label>
            <input
              type="datetime-local"
              name="transactionDate"
              defaultValue={new Date().toISOString().slice(0, 16)}
              className="w-full rounded border border-line bg-page px-3 py-2 text-sm"
            />
          </div>
        </div>

        {customerType === "registered" && (
          <div>
            <label className="block text-sm font-medium mb-1">
              Pilih Pengguna Terdaftar
            </label>
            <select
              name="userId"
              className="w-full rounded border border-line bg-page px-3 py-2 text-sm"
            >
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || "Tanpa Nama"} ({u.email})
                </option>
              ))}
            </select>
          </div>
        )}

        {customerType === "manual" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nama Pembeli
              </label>
              <input
                type="text"
                name="customerName"
                className="w-full rounded border border-line bg-page px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                No. WhatsApp / HP
              </label>
              <input
                type="text"
                name="customerPhone"
                className="w-full rounded border border-line bg-page px-3 py-2 text-sm"
                required
              />
            </div>
          </div>
        )}
      </section>

      {/* Bagian 3: Pembayaran & Pengiriman */}
      <section className="space-y-4 rounded-lg border border-line p-5 bg-surface/40">
        <h2 className="text-lg font-medium">3. Pembayaran & Pengiriman</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Metode Pembayaran
            </label>
            <select
              name="paymentMethod"
              className="w-full rounded border border-line bg-page px-3 py-2 text-sm"
            >
              <option value="tunai">Tunai</option>
              <option value="transfer">Transfer Bank</option>
              <option value="qris">QRIS</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Bukti Pembayaran (Opsional)
            </label>
            <input
              type="file"
              name="proofFile"
              accept="image/*"
              className="w-full text-sm pt-1"
            />
          </div>
        </div>

        <div className="pt-2">
          <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={isShipping}
              onChange={(e) => setIsShipping(e.target.checked)}
              className="rounded border-line"
            />
            Perlu Dikirim via Kurir? (Masuk alur booking kurir)
          </label>
        </div>

        {isShipping && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-line">
            <div>
              <label className="block text-xs font-medium mb-1">
                Nama Penerima
              </label>
              <input
                type="text"
                name="recipientName"
                className="w-full rounded border border-line bg-page px-3 py-1.5 text-sm"
                required={isShipping}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                No. HP Penerima
              </label>
              <input
                type="text"
                name="phone"
                className="w-full rounded border border-line bg-page px-3 py-1.5 text-sm"
                required={isShipping}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">
                Alamat Lengkap Pengiriman
              </label>
              <textarea
                name="shippingAddress"
                rows={2}
                className="w-full rounded border border-line bg-page px-3 py-1.5 text-sm"
                required={isShipping}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kode Pos</label>
              <input
                type="text"
                name="postalCode"
                className="w-full rounded border border-line bg-page px-3 py-1.5 text-sm"
                required={isShipping}
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium mb-1">
            Catatan Transaksi
          </label>
          <textarea
            name="notes"
            rows={2}
            placeholder="Catatan tambahan untuk transaksi ini..."
            className="w-full rounded border border-line bg-page px-3 py-2 text-sm"
          />
        </div>
      </section>

      <div>
        <button
          type="submit"
          disabled={pending}
          className="btn min-h-11 px-6 text-[15px]"
        >
          {pending ? "Menyimpan..." : "Simpan Penjualan Langsung"}
        </button>
      </div>
    </form>
  );
}
