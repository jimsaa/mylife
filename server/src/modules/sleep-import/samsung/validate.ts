import type { SamsungFieldConfidences } from './fieldKeys.js';
import {
  extractSleepScoreRetry,
  isSuspiciousSleepScore,
} from './extractors/sleepScore.js';
import { normalizeLines } from './shared.js';
import type { SamsungSleepExtracted } from './types.js';

export type FieldFlag = 'ok' | 'low_confidence' | 'requires_confirmation' | 'suspicious';

export interface ValidationResult {
  field_flags: Partial<Record<string, FieldFlag>>;
  requires_user_confirmation: boolean;
  suspicious_fields: string[];
  low_confidence_fields: string[];
  corrected: SamsungSleepExtracted;
  field_confidences: SamsungFieldConfidences;
}

const LOW_CONFIDENCE_THRESHOLD = 80;
const REQUIRES_CONFIRMATION_THRESHOLD = 60;

export function validateMergedExtraction(
  extracted: SamsungSleepExtracted,
  fieldConfidences: SamsungFieldConfidences,
  rawTexts: string[]
): ValidationResult {
  const field_flags: Partial<Record<string, FieldFlag>> = {};
  const suspicious_fields: string[] = [];
  const low_confidence_fields: string[] = [];
  let corrected = { ...extracted };
  let confidences = { ...fieldConfidences };

  if (isSuspiciousSleepScore(extracted.sleep_score, extracted.overall_rating)) {
    for (const rawText of rawTexts) {
      const retry = extractSleepScoreRetry(rawText, normalizeLines(rawText));
      if (retry.value !== null && retry.confidence > (confidences.sleep_score ?? 0)) {
        corrected.sleep_score = retry.value;
        confidences.sleep_score = retry.confidence;
        break;
      }
    }

    if (isSuspiciousSleepScore(corrected.sleep_score, corrected.overall_rating)) {
      field_flags.sleep_score = 'suspicious';
      suspicious_fields.push('sleep_score');
    }
  }

  for (const [field, confidence] of Object.entries(confidences)) {
    if (!confidence) continue;
    if (confidence < REQUIRES_CONFIRMATION_THRESHOLD) {
      field_flags[field] = 'requires_confirmation';
    } else if (confidence < LOW_CONFIDENCE_THRESHOLD) {
      field_flags[field] = 'low_confidence';
      low_confidence_fields.push(field);
    } else if (!field_flags[field]) {
      field_flags[field] = 'ok';
    }
  }

  for (const field of suspicious_fields) {
    field_flags[field] = 'suspicious';
  }

  const requires_user_confirmation =
    suspicious_fields.length > 0 ||
    Object.values(field_flags).some((flag) => flag === 'requires_confirmation');

  return {
    field_flags,
    requires_user_confirmation,
    suspicious_fields,
    low_confidence_fields,
    corrected,
    field_confidences: confidences,
  };
}
