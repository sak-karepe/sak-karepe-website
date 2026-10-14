/** "Tote Bag, Daun Jati!" menjadi "tote-bag-daun-jati". */
export function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)
      .replace(/^-+|-+$/g, "") || "produk"
  );
}
