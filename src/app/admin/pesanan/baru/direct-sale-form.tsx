"use client";

import { useState } from "react";
import {
  PlusIcon,
  TrashIcon,
  ShoppingBagIcon,
  UserIcon,
  CreditCardIcon,
  TruckIcon,
} from "@phosphor-icons/react/dist/ssr";
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

  const handleProductSelection = (index: number, value: string) => {
    // Cek apakah value yang diketik/dipilih cocok dengan nama produk di list
    const selected = productsList.find(
      (p) => p.name === value || p.id.toString() === value,
    );

    setItems((prev) => {
      const next = [...prev];
      if (selected) {
        // Jika produk ditemukan di katalog
        next[index] = {
          ...next[index],
          productId: selected.id,
          productName: selected.name,
          price: selected.price || 0,
        };
      } else {
        // Jika diketik manual sebagai item custom
        next[index] = {
          ...next[index],
          productId: null,
          productName: value,
          // Harga tidak di-reset ke 0 agar user bisa langsung ketik harga custom
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
    <form
      action={handleSubmit}
      className="w-full max-w-7xl mx-auto space-y-6 p-2 sm:p-4"
    >
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="customerType" value={customerType} />
      <input type="hidden" name="isShipping" value={String(isShipping)} />

      {error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger font-medium flex items-center justify-between shadow-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Main Layout Grid: Main Content (Left) + Order Summary (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column - Product Items */}
        <div className="lg:col-span-8 space-y-6">
          <section className="rounded-xl border border-line bg-surface/50 p-6 shadow-sm backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <ShoppingBagIcon className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold tracking-tight">
                  1. Item Penjualan
                </h2>
              </div>
              <span className="text-xs text-muted font-medium bg-page px-2.5 py-1 rounded-full border border-line">
                {items.length} Item
              </span>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-line/70 bg-page/40 hover:bg-page transition-colors space-y-3"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    {/* Catalog Selector */}
                    <div className="md:col-span-12">
                      <label className="block text-xs font-medium text-muted mb-1.5">
                        Pilih Produk Katalog atau Ketik Custom Item
                      </label>
                      <input
                        type="text"
                        list={`products-list-${idx}`}
                        value={item.productName}
                        onChange={(e) =>
                          handleProductSelection(idx, e.target.value)
                        }
                        placeholder="Cari produk dari katalog atau ketik nama item..."
                        className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                        required
                      />
                      <datalist id={`products-list-${idx}`}>
                        {productsList.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.stock !== null ? `Stok: ${p.stock}` : ""}{" "}
                            {p.price
                              ? `- Rp ${p.price.toLocaleString("id-ID")}`
                              : ""}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center pt-1 border-t border-line/40">
                    {/* Price */}
                    <div className="col-span-5 md:col-span-4">
                      <label className="block text-xs font-medium text-muted mb-1">
                        Harga (Rp)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(idx, "price", Number(e.target.value))
                        }
                        className="w-full rounded-md border border-line bg-page px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                        required
                      />
                    </div>

                    {/* Quantity */}
                    <div className="col-span-3 md:col-span-3">
                      <label className="block text-xs font-medium text-muted mb-1">
                        Jumlah
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(idx, "quantity", Number(e.target.value))
                        }
                        className="w-full rounded-md border border-line bg-page px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                        required
                      />
                    </div>

                    {/* Subtotal & Action */}
                    <div className="col-span-4 md:col-span-5 flex items-center justify-end gap-3 self-end pb-1">
                      <div className="text-right">
                        <span className="block text-[10px] text-muted uppercase tracking-wider font-semibold">
                          Subtotal
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          Rp{" "}
                          {(item.price * item.quantity).toLocaleString("id-ID")}
                        </span>
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItemRow(item.id)}
                          className="p-2 text-danger hover:bg-danger/10 rounded-md transition-colors"
                          title="Hapus Item"
                        >
                          <TrashIcon size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addItemRow}
              className="w-full py-2.5 border border-dashed border-accent/40 rounded-lg inline-flex items-center justify-center gap-2 text-sm font-medium text-accent hover:bg-accent/5 transition-colors"
            >
              <PlusIcon size={16} /> Tambah Item Baru
            </button>
          </section>
        </div>

        {/* Right Column - Customer, Payment & Summary */}
        <div className="lg:col-span-4 space-y-6">
          {/* Customer & Details */}
          <section className="rounded-xl border border-line bg-surface/50 p-5 shadow-sm backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <UserIcon className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold">2. Detail Pembeli</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Tipe Pembeli
                </label>
                <select
                  value={customerType}
                  onChange={(e) =>
                    setCustomerType(
                      e.target.value as "general" | "manual" | "registered",
                    )
                  }
                  className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="general">Pembeli Umum</option>
                  <option value="manual">Isi Nama & No. HP Manual</option>
                  <option value="registered">Pilih Pengguna Terdaftar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Tanggal Transaksi
                </label>
                <input
                  type="datetime-local"
                  name="transactionDate"
                  defaultValue={new Date().toISOString().slice(0, 16)}
                  className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              {customerType === "registered" && (
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    Pengguna Terdaftar
                  </label>
                  <select
                    name="userId"
                    className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
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
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Nama Pembeli
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      No. WhatsApp / HP
                    </label>
                    <input
                      type="text"
                      name="customerPhone"
                      className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Payment & Shipping */}
          <section className="rounded-xl border border-line bg-surface/50 p-5 shadow-sm backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-line">
              <CreditCardIcon className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold">3. Pembayaran & Kurir</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Metode Pembayaran
                </label>
                <select
                  name="paymentMethod"
                  className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                >
                  <option value="tunai">Tunai</option>
                  <option value="transfer">Transfer Bank</option>
                  <option value="qris">QRIS</option>
                  <option value="lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Bukti Pembayaran (Opsional)
                </label>
                <input
                  type="file"
                  name="proofFile"
                  accept="image/*"
                  className="w-full text-xs text-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20"
                />
              </div>

              <div className="pt-2 border-t border-line">
                <label className="inline-flex items-center gap-2.5 text-xs font-medium cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isShipping}
                    onChange={(e) => setIsShipping(e.target.checked)}
                    className="w-4 h-4 rounded border-line text-accent focus:ring-accent/20"
                  />
                  <span className="flex items-center gap-1.5">
                    <TruckIcon size={16} /> Perlu Dikirim via Kurir?
                  </span>
                </label>
              </div>

              {isShipping && (
                <div className="space-y-3 pt-3 border-t border-line/60 bg-page/30 p-3 rounded-lg">
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Nama Penerima
                    </label>
                    <input
                      type="text"
                      name="recipientName"
                      className="w-full rounded-md border border-line bg-page px-3 py-1.5 text-sm"
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
                      className="w-full rounded-md border border-line bg-page px-3 py-1.5 text-sm"
                      required={isShipping}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Alamat Lengkap
                    </label>
                    <textarea
                      name="shippingAddress"
                      rows={2}
                      className="w-full rounded-md border border-line bg-page px-3 py-1.5 text-sm"
                      required={isShipping}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">
                      Kode Pos
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      className="w-full rounded-md border border-line bg-page px-3 py-1.5 text-sm"
                      required={isShipping}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Catatan Transaksi
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Catatan tambahan..."
                  className="w-full rounded-md border border-line bg-page px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>
          </section>

          {/* Sticky Total & Submit Box */}
          <div className="rounded-xl border border-line bg-surface p-5 shadow-md space-y-4 sticky top-6">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <span className="text-sm text-muted font-medium">
                Total Tagihan
              </span>
              <span className="text-xl font-bold tracking-tight text-accent">
                Rp {totalAmount.toLocaleString("id-ID")}
              </span>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full btn h-11 px-6 text-sm font-semibold rounded-lg shadow transition-all disabled:opacity-50"
            >
              {pending ? "Menyimpan..." : "Simpan Penjualan Langsung"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
