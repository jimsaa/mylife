import { createWorker } from 'tesseract.js';
import { detectSessionConflicts, mergeSamsungSleepExtractions } from './mergeSamsungSleep.js';
import { calculateMorningReadiness } from './morningReadiness.js';
import { parseSamsungSleepScreenshot } from './pipeline.js';
import type {
  SamsungImageExtraction,
  SamsungScreenshotInput,
  SamsungSleepExtracted,
  SamsungSleepMultiExtractResult,
} from './types.js';
import { validateMergedExtraction } from './validate.js';

const MAX_IMAGES = 3;
const RECOMMENDED_IMAGES = 3;

export async function extractSamsungSleepScreenshot(imageBase64: string): Promise<SamsungSleepExtracted> {
  const result = await extractSamsungSleepFromImages([{ image_base64: imageBase64 }]);
  return result.extracted;
}

export async function extractSamsungSleepFromImages(
  images: SamsungScreenshotInput[]
): Promise<SamsungSleepMultiExtractResult> {
  if (!images.length) {
    throw new Error('At least one image is required');
  }
  if (images.length > MAX_IMAGES) {
    throw new Error(`Maximum ${MAX_IMAGES} images allowed (Overview, Sleep Factors, Sleep Stages)`);
  }

  const worker = await createWorker(['swe', 'eng']);
  const per_image: SamsungImageExtraction[] = [];
  const rawTexts: string[] = [];

  try {
    for (let image_index = 0; image_index < images.length; image_index += 1) {
      const image = images[image_index];
      const buffer = Buffer.from(image.image_base64, 'base64');
      const { data } = await worker.recognize(buffer);
      const ocrText = data.text ?? '';
      rawTexts.push(ocrText);
      const parsed = parseSamsungSleepScreenshot(ocrText);
      per_image.push({
        image_index,
        filename: image.filename ?? null,
        image_type: parsed.image_type,
        classification_confidence: parsed.classification_confidence,
        extracted: parsed.extracted,
        field_confidences: parsed.field_confidences,
      });
    }
  } finally {
    await worker.terminate();
  }

  const { merged, field_confidences } = mergeSamsungSleepExtractions(per_image);
  const validation = validateMergedExtraction(merged, field_confidences, rawTexts);
  const { has_session_conflict, session_conflicts } = detectSessionConflicts(per_image);

  const morning_readiness_preview =
    validation.corrected.date && validation.corrected.sleep_score !== null
      ? calculateMorningReadiness(validation.corrected)
      : null;

  return {
    extracted: validation.corrected,
    field_confidences: validation.field_confidences,
    field_flags: validation.field_flags,
    requires_user_confirmation: validation.requires_user_confirmation,
    suspicious_fields: validation.suspicious_fields,
    low_confidence_fields: validation.low_confidence_fields,
    per_image,
    image_count: images.length,
    has_session_conflict,
    session_conflicts,
    filenames: images.map((img, index) => img.filename ?? `image-${index + 1}.png`),
    morning_readiness_preview,
    pipeline_version: 'v2',
  };
}

export { MAX_IMAGES, RECOMMENDED_IMAGES };
