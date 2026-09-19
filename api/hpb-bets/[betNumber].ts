import type { VercelRequest, VercelResponse } from '@vercel/node';
import { findBet, HpbBetsError, loadHpbBets, settlePendingBet } from '../_lib/hpb-bets/service';
import type { HpbSettleInput } from '../_lib/hpb-bets/types';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../_lib/vercel-http';

function parseBetNumber(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new HpbBetsError(400, 'Bet ID must be a positive integer.');
  }
  return n;
}

function parseSettleBody(body: Record<string, unknown>): HpbSettleInput {
  const result = body.result;
  if (result !== 'win' && result !== 'loss' && result !== 'void') {
    throw new HpbBetsError(400, 'Result must be win, loss or void.');
  }
  const score =
    typeof body.actual_score === 'string'
      ? body.actual_score.trim() || null
      : body.actual_score === null
        ? null
        : undefined;
  const notes =
    typeof body.notes === 'string' ? body.notes : body.notes === null ? null : undefined;
  const readRaw = body.read_quality_score;
  let read_quality_score: 1 | 2 | 3 | 4 | 5 | undefined;
  if (readRaw !== undefined && readRaw !== null && readRaw !== '') {
    const n = Number(readRaw);
    if (![1, 2, 3, 4, 5].includes(n)) {
      throw new HpbBetsError(400, 'Read Quality must be 1–5.');
    }
    read_quality_score = n as 1 | 2 | 3 | 4 | 5;
  }
  const payoutRaw = body.payout_sek;
  const payout_sek =
    payoutRaw === undefined || payoutRaw === null || payoutRaw === ''
      ? undefined
      : Number(payoutRaw);
  if (payout_sek !== undefined && !Number.isFinite(payout_sek)) {
    throw new HpbBetsError(400, 'Payout must be a number.');
  }
  return { result, actual_score: score, notes, read_quality_score, payout_sek };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;

  try {
    const betNumber = parseBetNumber(req.query.betNumber);

    if (req.method === 'GET') {
      const payload = await loadHpbBets();
      const bet = findBet(payload.bets, betNumber);
      if (!bet) {
        res.status(404).json({ error: `Bet #${betNumber} was not found.` });
        return;
      }
      res.status(200).json({ ...payload, bet });
      return;
    }

    if (req.method === 'PATCH') {
      const input = parseSettleBody(readJsonBody<Record<string, unknown>>(req));
      const { payload, bet } = await settlePendingBet(betNumber, input);
      res.status(200).json({ ...payload, bet });
      return;
    }

    methodNotAllowed(res, ['GET', 'PATCH']);
  } catch (error) {
    if (error instanceof HpbBetsError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    const message = error instanceof Error ? error.message : 'Failed to update bet.';
    res.status(500).json({ error: message });
  }
}
