# Samsung Sleep Import — Regression Tests

This folder contains the **canonical test case** for Samsung Health morning import.

## Required screenshots

Place your three daily Samsung Health screenshots here:

| File | Screen |
|------|--------|
| `1-overview.png` | Sleep Overview |
| `2-sleep-factors.png` | Sleep Factors |
| `3-sleep-stages.png` | Sleep Stages |

## Expected values

`expected.json` defines the exact values the V2 pipeline must extract.

## OCR fixtures

`fixtures/*.ocr.txt` simulate Tesseract output for CI when PNG files are unavailable.

## Run tests

From the project root:

```bash
npm run test:samsung-sleep
```

Every change to the Samsung extraction pipeline **must** pass this suite before merge.

## Adding new screenshots

When Samsung updates their UI:

1. Replace the 3 PNG files.
2. Update `expected.json` with verified values.
3. Capture new OCR fixtures if needed (`npm run test:samsung-sleep -- --dump-ocr` when implemented).
