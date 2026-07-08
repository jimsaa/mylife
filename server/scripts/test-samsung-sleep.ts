import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifySamsungImage } from '../src/modules/sleep-import/samsung/classifyImage.js';
import { mergeSamsungSleepExtractions } from '../src/modules/sleep-import/samsung/mergeSamsungSleep.js';
import { parseSamsungSleepScreenshot } from '../src/modules/sleep-import/samsung/pipeline.js';
import { validateMergedExtraction } from '../src/modules/sleep-import/samsung/validate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const FIXTURES = path.join(ROOT, 'tests', 'samsung-sleep', 'fixtures');
const EXPECTED_PATH = path.join(ROOT, 'tests', 'samsung-sleep', 'expected.json');

const FIXTURE_FILES = [
  { file: 'overview.ocr.txt', type: 'overview' as const },
  { file: 'sleep-factors.ocr.txt', type: 'sleep_factors' as const },
  { file: 'sleep-stages.ocr.txt', type: 'sleep_stages' as const },
];

const MERGE_FIELDS = [
  'date',
  'time_in_bed_minutes',
  'actual_sleep_minutes',
  'bedtime',
  'wake_time',
  'sleep_score',
  'overall_rating',
  'actual_sleep_rating',
  'deep_sleep_rating',
  'rem_rating',
  'restfulness_rating',
  'sleep_latency_rating',
  'awake_minutes',
  'awake_percent',
  'rem_sleep_minutes',
  'rem_percent',
  'light_sleep_minutes',
  'light_percent',
  'deep_sleep_minutes',
  'deep_percent',
  'blood_oxygen_graph_detected',
];

function loadExpected(): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(EXPECTED_PATH, 'utf8'));
}

function runFixtureTests() {
  const expected = loadExpected();
  const perImage = FIXTURE_FILES.map((fixture, image_index) => {
    const rawText = fs.readFileSync(path.join(FIXTURES, fixture.file), 'utf8');
    const parsed = parseSamsungSleepScreenshot(rawText);
    const classification = classifySamsungImage(rawText);

    if (classification.image_type !== fixture.type) {
      throw new Error(
        `Classification failed for ${fixture.file}: expected ${fixture.type}, got ${classification.image_type}`
      );
    }

    return {
      image_index,
      filename: fixture.file,
      image_type: parsed.image_type,
      classification_confidence: parsed.classification_confidence,
      extracted: parsed.extracted,
      field_confidences: parsed.field_confidences,
    };
  });

  const { merged, field_confidences } = mergeSamsungSleepExtractions(perImage);
  const rawTexts = FIXTURE_FILES.map((fixture) =>
    fs.readFileSync(path.join(FIXTURES, fixture.file), 'utf8')
  );
  const validation = validateMergedExtraction(merged, field_confidences, rawTexts);
  const extracted = validation.corrected;

  const failures: string[] = [];

  for (const field of MERGE_FIELDS) {
    const expectedValue = expected[field];
    const actualValue = extracted[field as keyof typeof extracted];

    if (expectedValue !== actualValue) {
      failures.push(`${field}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
    }
  }

  if (validation.suspicious_fields.includes('sleep_score')) {
    failures.push('sleep_score flagged suspicious after merge (76 must not become low score)');
  }

  if ((field_confidences.sleep_score ?? 0) < 90) {
    failures.push(`sleep_score confidence too low: ${field_confidences.sleep_score}`);
  }

  if (failures.length) {
    console.error('Samsung sleep regression FAILED:\n');
    for (const failure of failures) console.error(`  ✗ ${failure}`);
    process.exit(1);
  }

  console.log('Samsung sleep regression PASSED');
  console.log(`  ✓ ${MERGE_FIELDS.length} fields matched expected.json`);
  console.log(`  ✓ Sleep score: ${extracted.sleep_score} (${field_confidences.sleep_score}% confidence)`);
  console.log('  ✓ 3 screen classifications correct');
}

runFixtureTests();
