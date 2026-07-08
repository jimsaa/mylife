import { emptyExtracted, extractFromText, mergeExtractedResults } from './normalizeExtracted.js';
import { extractWithOcr } from './ocrExtractor.js';
import { extractWithVision } from './visionExtractor.js';
import type { ExtractedSleepData } from './types.js';

export interface ExtractScreenshotInput {
  image_base64: string;
  mime_type?: string;
}

export async function extractSleepScreenshot(input: ExtractScreenshotInput): Promise<ExtractedSleepData> {
  const mimeType = input.mime_type ?? 'image/png';
  const buffer = Buffer.from(input.image_base64, 'base64');

  let visionResult: ExtractedSleepData | null = null;
  try {
    visionResult = await extractWithVision(input.image_base64, mimeType);
  } catch (error) {
    console.warn('Vision extraction unavailable:', error);
  }

  let ocrResult: ExtractedSleepData;
  try {
    ocrResult = await extractWithOcr(buffer);
  } catch (error) {
    console.warn('OCR extraction failed:', error);
    ocrResult = emptyExtracted('ocr_failed', 0.1);
  }

  if (visionResult) {
    return mergeExtractedResults(visionResult, ocrResult);
  }

  if (ocrResult.extraction_confidence > 0) {
    return ocrResult;
  }

  // Last-resort: attempt plain decode if buffer happens to contain embedded text (unlikely)
  const fallbackText = buffer.toString('utf8');
  if (fallbackText.trim().length > 20) {
    return extractFromText(fallbackText);
  }

  return emptyExtracted('none', 0, null);
}
