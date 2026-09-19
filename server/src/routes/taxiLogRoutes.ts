import { Router } from 'express';
import { CalculationError } from '../lib/taxilog/calculations/errors.js';
import {
  addTaxiSalaryPayment,
  getTaxiLogDay,
  getTaxiLogExport,
  getTaxiLogMonth,
  parseTaxiLogText,
  saveTaxiLogDay,
} from '../services/taxiLogService.js';

const router = Router();

function handleError(res: import('express').Response, error: unknown) {
  if (error instanceof CalculationError) {
    res.status(400).json({ error: error.messageSv, code: error.code });
    return;
  }
  const message = error instanceof Error ? error.message : 'Request failed';
  res.status(400).json({ error: message });
}

router.get('/month', (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!year || !month) {
      res.status(400).json({ error: 'year and month are required' });
      return;
    }
    res.json(getTaxiLogMonth(year, month));
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/day', (req, res) => {
  try {
    const date = String(req.query.date ?? '');
    res.json({ day: getTaxiLogDay(date), exportText: getTaxiLogExport(date) });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/parse', (req, res) => {
  try {
    res.json(parseTaxiLogText(String(req.body?.text ?? '')));
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/day', (req, res) => {
  try {
    const saved = saveTaxiLogDay({
      date: String(req.body.date ?? ''),
      grossIncome: String(req.body.grossIncome ?? ''),
      tips: String(req.body.tips ?? '0'),
      workedHours: String(req.body.workedHours ?? '0'),
      chargingKwh: String(req.body.chargingKwh ?? '0'),
    });
    res.status(201).json({ day: saved, exportText: getTaxiLogExport(saved?.date ?? req.body.date) });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/payment', (req, res) => {
  try {
    res.status(201).json(
      addTaxiSalaryPayment({
        year: Number(req.body.year),
        month: Number(req.body.month),
        paymentDate: String(req.body.paymentDate ?? ''),
        amount: String(req.body.amount ?? ''),
        notes: req.body.notes ?? null,
      }),
    );
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
