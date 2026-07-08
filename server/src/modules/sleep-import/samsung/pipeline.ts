import type { SamsungImageType } from './classifyImage.js';
import { classifySamsungImage } from './classifyImage.js';
import { extractBloodOxygenScreen } from './extractors/bloodOxygen.js';
import { extractOverviewScreen } from './extractors/overview.js';
import { extractSleepFactorsScreen } from './extractors/sleepFactors.js';
import { extractSleepStagesScreen } from './extractors/sleepStages.js';
import type { SamsungFieldConfidences } from './fieldKeys.js';
import { SAMSUNG_MERGE_FIELDS } from './fieldKeys.js';
import type { SamsungSleepExtracted } from './types.js';
import { normalizeLines, type FieldResult } from './shared.js';

export interface SamsungParseResult {
  image_type: SamsungImageType;
  classification_confidence: number;
  extracted: SamsungSleepExtracted;
  field_confidences: SamsungFieldConfidences;
}

function resultsToRecord(
  results: Record<string, FieldResult<unknown>>
): { extracted: Partial<SamsungSleepExtracted>; confidences: SamsungFieldConfidences } {
  const extracted: Partial<SamsungSleepExtracted> = {};
  const confidences: SamsungFieldConfidences = {};

  for (const [key, result] of Object.entries(results)) {
    if (result.confidence > 0) {
      (extracted as Record<string, unknown>)[key] = result.value;
      confidences[key as keyof SamsungFieldConfidences] = result.confidence;
    } else if (key === 'blood_oxygen_graph_detected') {
      extracted.blood_oxygen_graph_detected = false;
    }
  }

  return { extracted, confidences };
}

function extractByType(imageType: SamsungImageType, rawText: string): Record<string, FieldResult<unknown>> {
  switch (imageType) {
    case 'overview':
      return extractOverviewScreen(rawText);
    case 'sleep_factors':
      return extractSleepFactorsScreen(rawText);
    case 'sleep_stages':
      return extractSleepStagesScreen(rawText);
    case 'blood_oxygen':
      return extractBloodOxygenScreen(rawText);
    default:
      return {
        ...extractOverviewScreen(rawText),
        ...extractSleepFactorsScreen(rawText),
        ...extractSleepStagesScreen(rawText),
        ...extractBloodOxygenScreen(rawText),
      };
  }
}

function emptyExtracted(): SamsungSleepExtracted {
  return {
    source: 'Samsung Health Screenshot',
    screenshot_type: 'Sleep Details',
    date: null,
    time_in_bed_minutes: null,
    actual_sleep_minutes: null,
    bedtime: null,
    wake_time: null,
    sleep_score: null,
    overall_rating: null,
    actual_sleep_rating: null,
    deep_sleep_rating: null,
    rem_rating: null,
    restfulness_rating: null,
    sleep_latency_rating: null,
    awake_minutes: null,
    awake_percent: null,
    rem_sleep_minutes: null,
    rem_percent: null,
    light_sleep_minutes: null,
    light_percent: null,
    deep_sleep_minutes: null,
    deep_percent: null,
    sleep_spo2_min: null,
    sleep_spo2_avg: null,
    sleep_spo2_max: null,
    blood_oxygen_graph_detected: false,
    extraction_method: 'samsung_ocr',
    extraction_confidence: 0,
  };
}

/** Parse OCR text using Samsung V2 screen-specific rules. */
export function parseSamsungSleepScreenshot(rawText: string): SamsungParseResult {
  const classification = classifySamsungImage(rawText);
  const fieldResults = extractByType(classification.image_type, rawText);
  const { extracted: partial, confidences } = resultsToRecord(fieldResults);

  const confidenceValues = Object.values(confidences);
  const avgConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length / 100
      : 0;

  const extracted: SamsungSleepExtracted = {
    ...emptyExtracted(),
    ...partial,
    extraction_confidence: Math.round(avgConfidence * 100) / 100,
    raw_text: rawText,
  };

  return {
    image_type: classification.image_type,
    classification_confidence: classification.confidence,
    extracted,
    field_confidences: confidences,
  };
}

export function buildEmptyFieldConfidences(): SamsungFieldConfidences {
  return {};
}

export function countFilledFields(extracted: SamsungSleepExtracted): number {
  return SAMSUNG_MERGE_FIELDS.filter((field) => {
    const value = extracted[field];
    return value !== null && value !== undefined && value !== '';
  }).length;
}

export { normalizeLines };
