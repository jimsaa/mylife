import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { loadHpbBets, settlePendingBet } from "./service.js";
import type { HpbSeasonFile } from "./types.js";

function writeFixture(root: string, file: HpbSeasonFile): void {
  const seasonsDir = path.join(root, "data", "seasons");
  mkdirSync(seasonsDir, { recursive: true });
  writeFileSync(path.join(seasonsDir, "hpb-season-2026-27.json"), JSON.stringify(file, null, 2), "utf8");
  writeFileSync(
    path.join(root, "data", "betting-database.json"),
    JSON.stringify({ version: 2, season: file.season, startingBankroll: file.startingBankroll, bets: file.bets }, null, 2),
    "utf8"
  );
}

describe("HPB bets service", () => {
    it("loads historical bet ids including #26–#40 and can display #60", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hpb-bets-"));
    writeFixture(root, {
      version: 2,
      season: { id: "hpb-season-2026-27", label: "HPB Season 2026/27" },
      startingBankroll: 1000,
      lastUpdated: null,
      bets: [26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 60].map((n) => ({
        id: String(n),
        bet_number: n,
        created_at: "2026-09-01T12:00:00.000Z",
        match_label: n === 60 ? "Fixture Sixty" : `Match ${n}`,
        market: "total",
        timing: "pregame",
        stake: 1000,
        odds_decimal: 1.8,
        result: n === 60 ? "pending" : "win",
        pnl: n === 60 ? null : 800,
      })),
    });

    const payload = await loadHpbBets(root);
    const numbers = payload.bets.map((bet) => bet.bet_number);
    assert.ok([26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 60].every((n) => numbers.includes(n)));
    assert.equal(payload.bets.find((bet) => bet.bet_number === 60)?.result, "pending");
  });

    it("settles pending #60 to win, loss and void with automatic P/L", async () => {
    const cases = [
      { result: "win" as const, pnl: 620, payout: 1620 },
      { result: "loss" as const, pnl: -1000, payout: 0 },
      { result: "void" as const, pnl: 0, payout: 1000 },
    ];

    for (const testCase of cases) {
      const root = mkdtempSync(path.join(tmpdir(), "hpb-settle-"));
      writeFixture(root, {
        version: 2,
        season: { id: "hpb-season-2026-27", label: "HPB Season 2026/27" },
        startingBankroll: 1000,
        lastUpdated: null,
        bets: [
          {
            id: "60",
            bet_number: 60,
            created_at: "2026-09-19T12:00:00.000Z",
            match_label: "Pending Sixty",
            market: "moneyline",
            timing: "pregame",
            stake: 1000,
            odds_decimal: 1.62,
            result: "pending",
            pnl: null,
          },
        ],
      });

      const { bet, payload } = await settlePendingBet(
        60,
        { result: testCase.result, actual_score: "1-0", read_quality_score: 5 },
        root
      );
      assert.equal(bet.bet_number, 60);
      assert.equal(bet.result, testCase.result);
      assert.equal(bet.pnl, testCase.pnl);
      assert.equal(bet.payout_sek, testCase.payout);
      assert.equal(bet.actual_score, "1-0");
      assert.equal(bet.read_quality_score, 5);
      assert.equal(payload.bets.length, 1);
    }
  });

    it("refuses to change an already settled historical bet", async () => {
    const root = mkdtempSync(path.join(tmpdir(), "hpb-locked-"));
    writeFixture(root, {
      version: 2,
      season: { id: "hpb-season-2026-27", label: "HPB Season 2026/27" },
      startingBankroll: 1000,
      lastUpdated: null,
      bets: [
        {
          id: "40",
          bet_number: 40,
          created_at: "2026-09-06T12:00:00.000Z",
          match_label: "Valencia vs Barcelona",
          market: "moneyline",
          timing: "pregame",
          stake: 1000,
          odds_decimal: 2.62,
          result: "win",
          pnl: 1620,
        },
      ],
    });

    await assert.rejects(() => settlePendingBet(40, { result: "loss" }, root), /already win/);
  });
});
