import assert from "node:assert/strict";
import { test } from "node:test";
import { containsPattern } from "@/lib/search";

test("pola pencarian membungkus query dan meng-escape wildcard LIKE", () => {
  assert.equal(containsPattern("  sura "), "%sura%");
  assert.equal(containsPattern("50%_a\\b"), "%50\\%\\_a\\\\b%");
});
