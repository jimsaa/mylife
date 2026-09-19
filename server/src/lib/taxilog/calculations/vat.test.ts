import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "./errors";
import { calculateIncomeExVat, calculateVatAmount, calculateVatBreakdown } from "./vat";

test("VAT uses income times percent rate", () => {
  assert.equal(calculateVatAmount("3300", "6").toFixed(2), "198.00");
});

test("income excluding VAT subtracts VAT from income", () => {
  assert.equal(calculateIncomeExVat("3300", "198").toFixed(2), "3102.00");
});

test("VAT breakdown keeps rate, amount and income after VAT separate", () => {
  const result = calculateVatBreakdown("3300", "6");
  assert.equal(result.vatRate.toString(), "6");
  assert.equal(result.vatAmount.toFixed(2), "198.00");
  assert.equal(result.incomeExVat.toFixed(2), "3102.00");
});

test("VAT rejects negative income", () => {
  assert.throws(() => calculateVatAmount("-1", "6"), CalculationError);
});
