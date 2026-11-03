import assert from "node:assert/strict";
import { test } from "node:test";
import { lookupTable33Column1Tax, PRIVATE_THRESHOLD_TAX } from "./taxTable33_2026";

test("table 33 column 1 2026 looks up official intervals", () => {
  assert.equal(lookupTable33Column1Tax("15500").toFixed(2), PRIVATE_THRESHOLD_TAX + ".00");
  assert.equal(lookupTable33Column1Tax("14000").toFixed(2), "2020.00");
  assert.equal(lookupTable33Column1Tax("0").toFixed(2), "0.00");
});
