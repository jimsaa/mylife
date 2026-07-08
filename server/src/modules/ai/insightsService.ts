/**
 * Future AI module extension point.
 *
 * Planned capabilities:
 * - Life insights generation from historical patterns
 * - Productivity coaching based on time/energy correlations
 * - Meal calorie estimation from descriptions
 * - Burnout risk detection
 *
 * Use statsService.getInsightsContext() as the data source for LLM prompts.
 */

export interface AiInsightRequest {
  context: Record<string, unknown>;
  prompt_type: 'daily_summary' | 'weekly_review' | 'burnout_check' | 'meal_estimate';
}

export interface AiInsightResponse {
  content: string;
  generated_at: string;
  prompt_type: string;
}

// Placeholder — implement when AI features are added
export async function generateInsight(_request: AiInsightRequest): Promise<AiInsightResponse | null> {
  return null;
}
