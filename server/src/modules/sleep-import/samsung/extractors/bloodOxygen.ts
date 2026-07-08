import { parseInteger } from '../../parsers.js';
import { emptyField, field, normalizeOcrText, type FieldResult } from '../shared.js';

export function extractBloodOxygenScreen(rawText: string): Record<string, FieldResult<unknown>> {
  const text = normalizeOcrText(rawText);
  const hasSection = /syre|blood oxygen|spo2|syrgas/i.test(text);

  if (!hasSection) {
    return {
      sleep_spo2_min: emptyField<number>(),
      sleep_spo2_avg: emptyField<number>(),
      sleep_spo2_max: emptyField<number>(),
      blood_oxygen_graph_detected: emptyField<boolean>(),
    };
  }

  const labeledTriplet = text.match(
    /min[\s.:]*(\d{2,3})[\s\S]{0,40}?medel|avg|snitt[\s.:]*(\d{2,3})[\s\S]{0,40}?max[\s.:]*(\d{2,3})/i
  );
  if (labeledTriplet) {
    return {
      sleep_spo2_min: field(parseInteger(labeledTriplet[1]), 96),
      sleep_spo2_avg: field(parseInteger(labeledTriplet[2]), 96),
      sleep_spo2_max: field(parseInteger(labeledTriplet[3]), 96),
      blood_oxygen_graph_detected: field(false, 90),
    };
  }

  const percentages = [...text.matchAll(/\b(\d{2,3})\s*%/g)].map((m) => parseInt(m[1], 10));
  const oxygenPercents = percentages.filter((v) => v >= 85 && v <= 100);
  if (oxygenPercents.length >= 3) {
    return {
      sleep_spo2_min: field(Math.min(...oxygenPercents), 88),
      sleep_spo2_avg: field(Math.round(oxygenPercents.reduce((a, b) => a + b, 0) / oxygenPercents.length), 86),
      sleep_spo2_max: field(Math.max(...oxygenPercents), 88),
      blood_oxygen_graph_detected: field(false, 85),
    };
  }

  return {
    sleep_spo2_min: emptyField<number>(),
    sleep_spo2_avg: emptyField<number>(),
    sleep_spo2_max: emptyField<number>(),
    blood_oxygen_graph_detected: field(true, 78),
  };
}
