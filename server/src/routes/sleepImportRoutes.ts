import { Router } from 'express';
import { extractSleepScreenshot } from '../modules/sleep-import/extractSleepScreenshot.js';
import {
  extractSamsungSleepFromImages,
} from '../modules/sleep-import/samsung/extractSamsungSleep.js';
import { isSuspiciousSleepScore } from '../modules/sleep-import/samsung/extractors/sleepScore.js';
import { calculateMorningReadiness } from '../modules/sleep-import/samsung/morningReadiness.js';
import type { SaveSamsungSleepPayload, SamsungScreenshotInput } from '../modules/sleep-import/samsung/types.js';
import {
  findDuplicateSessions,
  getSleepImportHistory,
  getSleepSessions,
  saveSleepImport,
} from '../services/sleepImportService.js';
import type { SaveSleepImportPayload } from '../modules/sleep-import/types.js';

const router = Router();

router.get('/sessions', (_req, res) => {
  res.json(getSleepSessions());
});

router.get('/history', (_req, res) => {
  res.json(getSleepImportHistory());
});

router.post('/extract', async (req, res) => {
  try {
    const { image_base64, mime_type, filename } = req.body;
    if (!image_base64) {
      res.status(400).json({ error: 'image_base64 is required' });
      return;
    }

    const extracted = await extractSleepScreenshot({ image_base64, mime_type });
    const duplicates = extracted.date
      ? findDuplicateSessions(extracted.date, extracted.bedtime, extracted.wake_time)
      : [];

    res.json({ extracted, filename: filename ?? null, duplicates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Extraction failed' });
  }
});

router.post('/samsung/extract', async (req, res) => {
  try {
    const { image_base64, filename, images } = req.body as {
      image_base64?: string;
      filename?: string | null;
      images?: SamsungScreenshotInput[];
    };

    let result;
    if (Array.isArray(images) && images.length > 0) {
      result = await extractSamsungSleepFromImages(images);
    } else if (image_base64) {
      result = await extractSamsungSleepFromImages([{ image_base64, filename }]);
    } else {
      res.status(400).json({ error: 'images or image_base64 is required' });
      return;
    }

    const duplicates = result.extracted.date
      ? findDuplicateSessions(result.extracted.date, result.extracted.bedtime, result.extracted.wake_time)
      : [];

    res.json({ ...result, duplicates });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Samsung extraction failed' });
  }
});

router.post('/samsung/save', (req, res) => {
  try {
    const payload = req.body as SaveSamsungSleepPayload & {
      field_confidences_json?: string;
      extraction_flags_json?: string;
    };
    if (!payload?.session?.date) {
      res.status(400).json({ error: 'session.date is required' });
      return;
    }

    if (
      !payload.user_confirmed &&
      isSuspiciousSleepScore(payload.session.sleep_score ?? null, payload.session.overall_rating ?? null)
    ) {
      res.status(422).json({
        error: 'confirmation_required',
        message: 'Sömnpoängen ser misstänkt ut. Bekräfta eller redigera innan du sparar.',
      });
      return;
    }

    const duplicates = findDuplicateSessions(
      payload.session.date,
      payload.session.bedtime,
      payload.session.wake_time
    );

    if (duplicates.length > 0 && !['update', 'keep_both'].includes(payload.duplicate_action ?? '')) {
      res.status(409).json({
        error: 'duplicate_detected',
        message: 'Den här natten verkar redan finnas. Vill du uppdatera den?',
        duplicates,
      });
      return;
    }

    const readiness = calculateMorningReadiness({
      source: 'Samsung Health Screenshot',
      screenshot_type: 'Sleep Details',
      date: payload.session.date,
      bedtime: payload.session.bedtime ?? null,
      wake_time: payload.session.wake_time ?? null,
      time_in_bed_minutes: payload.session.time_in_bed_minutes ?? null,
      actual_sleep_minutes: payload.session.actual_sleep_minutes ?? null,
      sleep_score: payload.session.sleep_score ?? null,
      overall_rating: payload.session.overall_rating ?? null,
      actual_sleep_rating: payload.session.actual_sleep_rating ?? null,
      deep_sleep_rating: payload.session.deep_sleep_rating ?? null,
      rem_rating: payload.session.rem_rating ?? null,
      restfulness_rating: payload.session.restfulness_rating ?? null,
      sleep_latency_rating: payload.session.sleep_latency_rating ?? null,
      awake_minutes: payload.session.awake_minutes ?? null,
      awake_percent: payload.session.awake_percent ?? null,
      rem_sleep_minutes: payload.session.rem_sleep_minutes ?? null,
      rem_percent: payload.session.rem_percent ?? null,
      light_sleep_minutes: payload.session.light_sleep_minutes ?? null,
      light_percent: payload.session.light_percent ?? null,
      deep_sleep_minutes: payload.session.deep_sleep_minutes ?? null,
      deep_percent: payload.session.deep_percent ?? null,
      sleep_spo2_min: payload.session.sleep_spo2_min ?? null,
      sleep_spo2_avg: payload.session.sleep_spo2_avg ?? null,
      sleep_spo2_max: payload.session.sleep_spo2_max ?? null,
      blood_oxygen_graph_detected: payload.session.blood_oxygen_graph_detected ?? false,
      extraction_method: 'samsung_ocr',
      extraction_confidence: payload.extraction_confidence ?? 0,
    });

    const result = saveSleepImport({
      session: {
        ...payload.session,
        rem_sleep_rating: payload.session.rem_sleep_rating ?? payload.session.rem_rating ?? null,
        morning_readiness_score: readiness.score,
        morning_readiness_label: readiness.label,
      },
      filename: payload.filenames?.join(', ') ?? payload.filename,
      extraction_method: 'samsung_ocr_v2',
      extraction_confidence: payload.extraction_confidence,
      screenshot_base64: payload.screenshot_base64,
      screenshots: payload.screenshots ?? undefined,
      duplicate_action: payload.duplicate_action,
      existing_session_id: payload.existing_session_id,
      screenshot_type: 'Sleep Details',
      field_confidences_json: payload.field_confidences_json ?? null,
      extraction_flags_json: payload.extraction_flags_json ?? null,
      pipeline_version: 'v2',
    });

    res.status(201).json({ ...result, morning_readiness: readiness });
  } catch (error) {
    if (error instanceof Error && error.message === 'Import cancelled by user') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Save failed' });
  }
});

router.post('/check-duplicates', (req, res) => {
  const { date, bedtime, wake_time } = req.body;
  if (!date) {
    res.status(400).json({ error: 'date is required' });
    return;
  }
  res.json(findDuplicateSessions(date, bedtime, wake_time));
});

router.post('/save', (req, res) => {
  try {
    const payload = req.body as SaveSleepImportPayload;
    if (!payload?.session?.date) {
      res.status(400).json({ error: 'session.date is required' });
      return;
    }

    const duplicates = findDuplicateSessions(
      payload.session.date,
      payload.session.bedtime,
      payload.session.wake_time
    );

    if (duplicates.length > 0 && !['update', 'keep_both'].includes(payload.duplicate_action ?? '')) {
      res.status(409).json({
        error: 'duplicate_detected',
        message: 'Det verkar som att denna natt redan har importerats. Vill du uppdatera befintlig data?',
        duplicates,
      });
      return;
    }

    const result = saveSleepImport(payload);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Import cancelled by user') {
      res.status(400).json({ error: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Save failed' });
  }
});

export default router;
