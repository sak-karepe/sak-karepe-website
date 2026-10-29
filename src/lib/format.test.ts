import assert from "node:assert";
import { test } from "node:test";
import { parseAmount } from "@/lib/format";

test("parseAmount membaca format rupiah", () => {
  assert.equal(parseAmount("150.000"), 150000);
  assert.equal(parseAmount("Rp150000"), 150000);
  assert.equal(parseAmount("Rp 150.000,00"), 150000);
  assert.equal(parseAmount("150.000,5"), 150000);
  assert.equal(parseAmount("0"), 0);
  assert.equal(parseAmount(""), null);
  assert.equal(parseAmount(null), null);
});
