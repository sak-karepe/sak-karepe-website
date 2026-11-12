import assert from "node:assert";
import { test } from "node:test";
import { parseAmount, sanitizeSlugInput, slugify } from "@/lib/format";

test("parseAmount membaca format rupiah", () => {
  assert.equal(parseAmount("150.000"), 150000);
  assert.equal(parseAmount("Rp150000"), 150000);
  assert.equal(parseAmount("Rp 150.000,00"), 150000);
  assert.equal(parseAmount("150.000,5"), 150000);
  assert.equal(parseAmount("0"), 0);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount(null), null);
});

test("sanitizeSlugInput dan slugify mengubah nama serta menolak slash", () => {
  assert.equal(slugify("Tote Bag, Daun Jati!"), "tote-bag-daun-jati");
  assert.equal(sanitizeSlugInput("/tote/bag daun"), "tote-bag-daun");
  assert.equal(sanitizeSlugInput("Tote Bag -"), "tote-bag-");
  assert.equal(slugify("///"), "produk");
});
