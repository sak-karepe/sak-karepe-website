import type { Address } from "@/db/schema";

/** Jalan, kelurahan, kecamatan, kota, provinsi; kelurahan kosong untuk alamat lama. */
export function formatAddress(address: Pick<Address, "street" | "village" | "district" | "city" | "province">) {
  return [address.street, address.village && `Kel. ${address.village}`, `Kec. ${address.district}`, address.city, address.province]
    .filter(Boolean)
    .join(", ");
}
