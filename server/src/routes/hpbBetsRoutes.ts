import { Router } from "express";
import { HpbBetsError, findBet, loadHpbBets, settlePendingBet } from "../lib/hpb-bets/service.js";
import type { HpbSettleInput } from "../lib/hpb-bets/types.js";

const router = Router();

function parseBetNumber(value: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HpbBetsError(400, "Bet ID must be a positive integer.");
  }
  return n;
}

function parseSettleBody(body: unknown): HpbSettleInput {
  const raw = (body ?? {}) as Record<string, unknown>;
  const result = raw.result;
  if (result !== "win" && result !== "loss" && result !== "void") {
    throw new HpbBetsError(400, "Result must be win, loss or void.");
  }

  const score =
    typeof raw.actual_score === "string"
      ? raw.actual_score.trim() || null
      : raw.actual_score === null
        ? null
        : undefined;
  const notes =
    typeof raw.notes === "string"
      ? raw.notes
      : raw.notes === null
        ? null
        : undefined;
  const readRaw = raw.read_quality_score;
  let read_quality_score: 1 | 2 | 3 | 4 | 5 | null | undefined;
  if (readRaw === null || readRaw === "") {
    read_quality_score = undefined;
  } else if (readRaw !== undefined) {
    const n = Number(readRaw);
    if (![1, 2, 3, 4, 5].includes(n)) {
      throw new HpbBetsError(400, "Read Quality must be 1–5.");
    }
    read_quality_score = n as 1 | 2 | 3 | 4 | 5;
  }

  const payoutRaw = raw.payout_sek;
  const payout_sek =
    payoutRaw === undefined || payoutRaw === null || payoutRaw === ""
      ? undefined
      : Number(payoutRaw);
  if (payout_sek !== undefined && !Number.isFinite(payout_sek)) {
    throw new HpbBetsError(400, "Payout must be a number.");
  }

  return { result, actual_score: score, notes, read_quality_score, payout_sek };
}

router.get("/", async (_req, res) => {
  try {
    res.json(await loadHpbBets());
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load HPB bets.";
    res.status(500).json({ error: message });
  }
});

router.get("/:betNumber", async (req, res) => {
  try {
    const betNumber = parseBetNumber(req.params.betNumber);
    const payload = await loadHpbBets();
    const bet = findBet(payload.bets, betNumber);
    if (!bet) {
      res.status(404).json({ error: `Bet #${betNumber} was not found.` });
      return;
    }
    res.json({ ...payload, bet });
  } catch (error) {
    if (error instanceof HpbBetsError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to load bet.";
    res.status(500).json({ error: message });
  }
});

router.patch("/:betNumber", async (req, res) => {
  try {
    const betNumber = parseBetNumber(req.params.betNumber);
    const input = parseSettleBody(req.body);
    const { payload, bet } = await settlePendingBet(betNumber, input);
    res.json({ ...payload, bet });
  } catch (error) {
    if (error instanceof HpbBetsError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : "Failed to update bet.";
    res.status(500).json({ error: message });
  }
});

export default router;
