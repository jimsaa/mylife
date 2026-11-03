import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "./errors";
import { projectSalarySplit as vercelSplit } from "../../../../../api/_lib/taxilog/calculations/savings.ts";
import { projectSalarySplit, upsertSavingsEntry } from "./savings";

test("A: accrued 15500 allocates full private salary with table tax and no surplus", () => {
  const split = projectSalarySplit("15500");
  assert.equal(split.privateGrossAllocation.toFixed(2), "15500.00");
  assert.equal(split.preliminaryTax.toFixed(2), "2319.00");
  assert.equal(split.projectedPrivateNet.toFixed(2), "13181.00");
  assert.equal(split.projectedSurplus.toFixed(2), "0.00");
  assert.equal(split.projectedShortfall.toFixed(2), "0.00");
});

test("B: accrued 20000 keeps 15500 private and 4500 surplus without taxing surplus", () => {
  const split = projectSalarySplit("20000");
  assert.equal(split.privateGrossAllocation.toFixed(2), "15500.00");
  assert.equal(split.preliminaryTax.toFixed(2), "2319.00");
  assert.equal(split.projectedPrivateNet.toFixed(2), "13181.00");
  assert.equal(split.projectedSurplus.toFixed(2), "4500.00");
  assert.equal(split.projectedShortfall.toFixed(2), "0.00");
});

test("18000 accrued keeps 15500 private and 2500 surplus without taxing surplus", () => {
  const split = projectSalarySplit("18000");
  assert.equal(split.privateGrossAllocation.toFixed(2), "15500.00");
  assert.equal(split.preliminaryTax.toFixed(2), "2319.00");
  assert.equal(split.projectedPrivateNet.toFixed(2), "13181.00");
  assert.equal(split.projectedSurplus.toFixed(2), "2500.00");
  assert.equal(split.projectedShortfall.toFixed(2), "0.00");
});

test("C: below 15500 shows available gross and remaining to threshold, not 13181 net", () => {
  const split = projectSalarySplit("14000");
  assert.equal(split.privateGrossAllocation.toFixed(2), "14000.00");
  assert.equal(split.preliminaryTax.toFixed(2), "0.00");
  assert.equal(split.projectedPrivateNet.toFixed(2), "0.00");
  assert.equal(split.projectedSurplus.toFixed(2), "0.00");
  assert.equal(split.projectedShortfall.toFixed(2), "1500.00");
});

test("Express and Vercel use the same fixed salary split", () => {
  for (const accrued of ["14000", "15500", "18000", "20000"]) {
    const server = projectSalarySplit(accrued);
    const vercel = vercelSplit(accrued);
    assert.equal(server.privateGrossAllocation.toFixed(2), vercel.privateGrossAllocation.toFixed(2));
    assert.equal(server.preliminaryTax.toFixed(2), vercel.preliminaryTax.toFixed(2));
    assert.equal(server.projectedPrivateNet.toFixed(2), vercel.projectedPrivateNet.toFixed(2));
    assert.equal(server.projectedSurplus.toFixed(2), vercel.projectedSurplus.toFixed(2));
    assert.equal(server.projectedShortfall.toFixed(2), vercel.projectedShortfall.toFixed(2));
  }
});

test("salary surplus is never negative", () => {
  const under = projectSalarySplit("11000");
  assert.equal(under.projectedSurplus.toFixed(2), "0.00");
  assert.ok(under.projectedShortfall.greaterThan(0));
});

test("savings upserts are idempotent for the same source key", () => {
  const first = upsertSavingsEntry([], {
    occurredAt: "2026-11-02",
    kind: "TIPS",
    amount: "50",
    sourceKey: "tips:2026-11-02",
    description: "Dricks 2026-11-02",
  });
  const second = upsertSavingsEntry(first, {
    occurredAt: "2026-11-02",
    kind: "TIPS",
    amount: "50",
    sourceKey: "tips:2026-11-02",
    description: "Dricks 2026-11-02",
  });
  assert.equal(second.length, 1);
  assert.equal(second[0]?.amount, "50.00");
});

test("withdrawals cannot take the savings balance below zero", () => {
  const funded = upsertSavingsEntry([], {
    occurredAt: "2026-11-02",
    kind: "MANUAL_DEPOSIT",
    amount: "100",
    sourceKey: "manual:in:1",
    description: "Insättning",
  });
  assert.throws(
    () =>
      upsertSavingsEntry(funded, {
        occurredAt: "2026-11-02",
        kind: "MANUAL_WITHDRAWAL",
        amount: "150",
        sourceKey: "manual:out:1",
        description: "Uttag",
      }),
    CalculationError,
  );
});
