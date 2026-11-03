import assert from "node:assert/strict";
import { test } from "node:test";
import { CalculationError } from "./errors";
import { projectSalarySplit, upsertSavingsEntry } from "./savings";

test("salary surplus is only the amount above 13000 and never negative", () => {
  const over = projectSalarySplit("17000");
  assert.equal(over.projectedPrivateNet.toFixed(2), "13000.00");
  assert.equal(over.projectedSurplus.toFixed(2), "4000.00");
  assert.equal(over.projectedShortfall.toFixed(2), "0.00");

  const under = projectSalarySplit("11000");
  assert.equal(under.projectedPrivateNet.toFixed(2), "11000.00");
  assert.equal(under.projectedSurplus.toFixed(2), "0.00");
  assert.equal(under.projectedShortfall.toFixed(2), "2000.00");
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
