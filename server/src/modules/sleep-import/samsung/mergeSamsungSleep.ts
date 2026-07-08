import { SAMSUNG_MERGE_FIELDS, type SamsungFieldConfidences, type SamsungMergeField } from './fieldKeys.js';
import type { SamsungImageExtraction, SamsungSessionConflict, SamsungSleepExtracted } from './types.js';

function fieldValue(extracted: SamsungSleepExtracted, field: SamsungMergeField): unknown {
  return extracted[field];
}

function isEmpty(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function pickMergedField(
  perImage: SamsungImageExtraction[],
  field: SamsungMergeField
): { value: unknown; confidence: number } {
  let bestValue: unknown = null;
  let bestConfidence = 0;

  for (const image of perImage) {
    const value = fieldValue(image.extracted, field);
    if (isEmpty(value)) continue;

    const confidence = image.field_confidences[field] ?? 0;
    if (confidence > bestConfidence) {
      bestValue = value;
      bestConfidence = confidence;
    } else if (confidence === bestConfidence && confidence > 0 && isEmpty(bestValue)) {
      bestValue = value;
    }
  }

  return { value: bestValue, confidence: bestConfidence };
}

export function mergeSamsungSleepExtractions(perImage: SamsungImageExtraction[]): {
  merged: SamsungSleepExtracted;
  field_confidences: SamsungFieldConfidences;
} {
  const merged: Record<string, unknown> = {
    source: 'Samsung Health Screenshot',
    screenshot_type: 'Sleep Details',
    extraction_method: 'samsung_ocr',
  };
  const field_confidences: SamsungFieldConfidences = {};
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const field of SAMSUNG_MERGE_FIELDS) {
    const { value, confidence } = pickMergedField(perImage, field);
    merged[field] = isEmpty(value) ? (field === 'blood_oxygen_graph_detected' ? false : null) : value;
    if (confidence > 0) {
      field_confidences[field] = confidence;
      confidenceSum += confidence;
      confidenceCount += 1;
    }
  }

  merged.extraction_confidence =
    confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount / 100) * 100) / 100 : 0;

  return {
    merged: merged as SamsungSleepExtracted,
    field_confidences,
  };
}

export function detectSessionConflicts(perImage: SamsungImageExtraction[]): {
  has_session_conflict: boolean;
  session_conflicts: SamsungSessionConflict[];
} {
  const session_conflicts: SamsungSessionConflict[] = perImage.map((image, image_index) => ({
    image_index,
    filename: image.filename ?? null,
    date: image.extracted.date,
    bedtime: image.extracted.bedtime,
    wake_time: image.extracted.wake_time,
  }));

  const dated = session_conflicts.filter((s) => s.date);
  const uniqueDates = new Set(dated.map((s) => s.date));
  if (uniqueDates.size > 1) {
    return { has_session_conflict: true, session_conflicts };
  }

  if (dated.length > 0) {
    const bedtimes = new Set(dated.map((s) => s.bedtime).filter(Boolean));
    const wakeTimes = new Set(dated.map((s) => s.wake_time).filter(Boolean));
    if (bedtimes.size > 1 || wakeTimes.size > 1) {
      return { has_session_conflict: true, session_conflicts };
    }
  }

  const keys = new Set(
    dated.map((s) => `${s.date}|${s.bedtime ?? ''}|${s.wake_time ?? ''}`)
  );
  if (keys.size > 1) {
    return { has_session_conflict: true, session_conflicts };
  }

  return { has_session_conflict: false, session_conflicts };
}
