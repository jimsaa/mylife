import { createWorker } from 'tesseract.js';
import { extractFromText } from './normalizeExtracted.js';
import type { ExtractedSleepData } from './types.js';

export async function extractWithOcr(imageBuffer: Buffer): Promise<ExtractedSleepData> {
  const worker = await createWorker(['swe', 'eng']);
  try {
    const { data } = await worker.recognize(imageBuffer);
    return extractFromText(data.text ?? '');
  } finally {
    await worker.terminate();
  }
}
