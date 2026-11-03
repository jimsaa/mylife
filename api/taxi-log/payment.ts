import type { VercelRequest, VercelResponse } from '@vercel/node';
import { addPayment, addSavings } from '../_lib/taxi-log-store';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const body = readJsonBody<{
      year?: number;
      month?: number;
      paymentDate?: string;
      amount?: string;
      notes?: string | null;
      date?: string;
      kind?: string;
      description?: string;
      action?: string;
    }>(req);
    const action = String(req.query.action ?? body.action ?? '');
    const isSavings =
      action === 'savings' ||
      body.kind === 'MANUAL_DEPOSIT' ||
      body.kind === 'MANUAL_WITHDRAWAL';

    if (isSavings) {
      res.status(201).json(
        await addSavings({
          date: String(body.date ?? ''),
          amount: String(body.amount ?? ''),
          kind: body.kind === 'MANUAL_WITHDRAWAL' ? 'MANUAL_WITHDRAWAL' : 'MANUAL_DEPOSIT',
          description: String(body.description ?? ''),
        }),
      );
      return;
    }

    res.status(201).json(
      await addPayment({
        year: Number(body.year),
        month: Number(body.month),
        paymentDate: String(body.paymentDate ?? ''),
        amount: String(body.amount ?? ''),
        notes: body.notes ?? null,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Request failed';
    res.status(400).json({ error: message });
  }
}
