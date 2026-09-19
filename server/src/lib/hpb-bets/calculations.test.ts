import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyRunningBankroll,
  calculatePayout,
  calculatePnl,
  computeResultStats,
  filterBets,
  matchesSearch,
  settleBetRecord,
  sortBets,
} from "./calculations.js";
import type { HpbBet } from "./types.js";

function bet(overrides: Partial<HpbBet> & Pick<HpbBet, "id" | "bet_number" | "result">): HpbBet {
  return {
    created_at: "2026-09-01T12:00:00.000Z",
    match_label: "Test Match",
    market: "total",
    timing: "pregame",
    stake: 1000,
    odds_decimal: 2,
    pnl: null,
    notes: null,
    pressure_gauge: null,
    read_quality: null,
    ...overrides,
  };
}

describe("HPB result calculations", () => {
  it("calculates WIN payout and P/L from stake 1000 @ 2.00", () => {
    assert.equal(calculatePayout(1000, 2, "win"), 2000);
    assert.equal(calculatePnl(1000, 2, "win"), 1000);
  });

  it("calculates LOSS payout 0 and P/L -1000", () => {
    assert.equal(calculatePayout(1000, 1.82, "loss"), 0);
    assert.equal(calculatePnl(1000, 1.82, "loss"), -1000);
  });

  it("calculates VOID payout stake and P/L 0", () => {
    assert.equal(calculatePayout(1000, 2.62, "void"), 1000);
    assert.equal(calculatePnl(1000, 2.62, "void"), 0);
  });

  it("does not use a bookmaker cash stake — stored HPB stake is used", () => {
    const settled = settleBetRecord(
      bet({ id: "60", bet_number: 60, result: "pending", stake: 1000, odds_decimal: 1.5 }),
      { result: "win" }
    );
    assert.equal(settled.stake, 1000);
    assert.equal(settled.pnl, 500);
    assert.equal(settled.payout_sek, 1500);
  });

  it("keeps Bet #60 identity when settling", () => {
    const settled = settleBetRecord(bet({ id: "60", bet_number: 60, result: "pending" }), {
      result: "loss",
      actual_score: "0-1",
      read_quality_score: 4,
      notes: "Late miss",
    });
    assert.equal(settled.id, "60");
    assert.equal(settled.bet_number, 60);
    assert.equal(settled.result, "loss");
    assert.equal(settled.actual_score, "0-1");
    assert.equal(settled.read_quality, "B");
    assert.equal(settled.read_quality_score, 4);
    assert.equal(settled.notes, "Late miss");
  });

  it("computes stats from settled bets only and ignores pending/void in win rate", () => {
    const bets = [
      bet({ id: "1", bet_number: 1, result: "win", odds_decimal: 2, read_quality_score: 5 }),
      bet({ id: "2", bet_number: 2, result: "loss", odds_decimal: 1.5, read_quality_score: 3 }),
      bet({ id: "3", bet_number: 3, result: "pending", odds_decimal: 3 }),
      bet({ id: "4", bet_number: 4, result: "void", odds_decimal: 1.9 }),
    ];
    const stats = computeResultStats(bets);
    assert.equal(stats.totalProfit, 0);
    assert.equal(stats.wins, 1);
    assert.equal(stats.losses, 1);
    assert.equal(stats.winRate, 0.5);
    assert.equal(stats.pending, 1);
    assert.equal(stats.voids, 1);
    assert.equal(stats.averageOdds, 1.75);
    assert.equal(stats.averageReadQuality, 4);
  });

  it("searches match, market, notes and bet id", () => {
    const row = bet({
      id: "39",
      bet_number: 39,
      result: "win",
      match_label: "Arsenal vs Chelsea",
      market: "cards",
      notes: "Totalt 6 kort",
    });
    assert.equal(matchesSearch(row, "39"), true);
    assert.equal(matchesSearch(row, "#39"), true);
    assert.equal(matchesSearch(row, "arsenal"), true);
    assert.equal(matchesSearch(row, "cards"), true);
    assert.equal(matchesSearch(row, "kort"), true);
    assert.equal(matchesSearch(row, "barcelona"), false);
  });

  it("filters and sorts without changing bet numbers", () => {
    const bets = [
      bet({ id: "26", bet_number: 26, result: "win", odds_decimal: 1.4, pnl: 400 }),
      bet({ id: "60", bet_number: 60, result: "pending", odds_decimal: 3.1, pnl: null }),
      bet({ id: "37", bet_number: 37, result: "loss", odds_decimal: 1.63, pnl: -1000 }),
    ];
    const pending = filterBets(bets, { result: "pending" });
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.bet_number, 60);

    const newest = sortBets(bets, "newest");
    assert.deepEqual(
      newest.map((row) => row.bet_number),
      [60, 37, 26]
    );
  });

  it("recalculates running bankroll after a pending win", () => {
    const bets = applyRunningBankroll(
      [
        bet({ id: "1", bet_number: 1, result: "win", odds_decimal: 2, stake: 1000 }),
        settleBetRecord(bet({ id: "2", bet_number: 2, result: "pending", odds_decimal: 1.5 }), {
          result: "win",
        }),
      ],
      1000
    );
    assert.equal(bets[0]?.pnl, 1000);
    assert.equal(bets[1]?.pnl, 500);
    assert.equal(bets[1]?.bankroll_after_bet, 2500);
  });
});
