import type { VercelRequest, VercelResponse } from '@vercel/node';
import { addPayment } from '../_lib/taxi-log-store';
import { methodNotAllowed, readJsonBody, requireAdmin } from '../_lib/vercel-http';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  try {
    const body = readJsonBody<{
      year: number;
      month: number;
      paymentDate: string;
      amount: string;
      notes?: string | null;
    }>(req);
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
