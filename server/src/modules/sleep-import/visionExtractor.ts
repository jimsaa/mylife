import { getSetting } from '../../services/settingsService.js';
import { normalizeExtractedPayload } from './normalizeExtracted.js';
import type { ExtractedSleepData } from './types.js';

const SYSTEM_PROMPT = `You extract ALL sleep-related information from health app screenshots (Samsung Health, Google Fit, Apple Health, etc.).

Return ONLY valid JSON with this structure:
{
  "source": "app name if visible or null",
  "date": "YYYY-MM-DD or raw date text",
  "bedtime": "HH:MM or null",
  "wake_time": "HH:MM or null",
  "time_in_bed_minutes": number or duration string or null,
  "actual_sleep_minutes": number or duration string or null,
  "sleep_score": number or null,
  "overall_rating": "text rating or null",
  "deep_sleep_minutes": number or duration string or null,
  "deep_sleep_rating": "text or null",
  "rem_sleep_minutes": number or duration string or null,
  "rem_sleep_rating": "text or null",
  "light_sleep_minutes": number or duration string or null,
  "awake_minutes": number or duration string or null,
  "sleep_efficiency_percent": number or null,
  "sleep_spo2_percent": number or null,
  "snoring_minutes": number or null,
  "snoring_detected": boolean or null,
  "sleep_avg_heart_rate": number or null,
  "sleep_min_heart_rate": number or null,
  "sleep_max_heart_rate": number or null,
  "unknown_metrics": [
    {
      "metric_name": "snake_case_name",
      "metric_value": "value as string",
      "metric_unit": "unit or null",
      "original_label": "exact label from screenshot"
    }
  ]
}

Rules:
- Capture EVERY sleep-related metric visible, even if layout is unfamiliar.
- Put unmapped metrics in unknown_metrics — never discard data.
- Support Swedish and English labels.
- Durations may be written as "8 h 33 m" — keep as string or convert to minutes.
- If unsure, include the field with best guess and add confidence context in unknown_metrics notes if needed.`;

export async function extractWithVision(
  imageBase64: string,
  mimeType: string
): Promise<ExtractedSleepData | null> {
  const apiKey = getSetting('openai_api_key');
  if (!apiKey) return null;

  const model = getSetting('sleep_import_vision_model') ?? 'gpt-4o-mini';
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Extract all sleep-related data from this screenshot. Return JSON only.',
            },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision extraction failed: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content) as Record<string, unknown>;
  return normalizeExtractedPayload(parsed, 'ai_vision', 0.9);
}
