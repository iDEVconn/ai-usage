import type { AiUsageRange } from '../types';

export const AI_USAGE_SUMMARY_QUERY_KEY = (range: AiUsageRange, userId?: string | null) =>
  ['ai-usage', 'summary', range, userId ?? null] as const;

export const AI_USAGE_TIMESERIES_QUERY_KEY = (range: AiUsageRange, userId?: string | null) =>
  ['ai-usage', 'timeseries', range, userId ?? null] as const;

export function buildAiUsageQueryPath(
  base: 'summary' | 'timeseries',
  range: AiUsageRange,
  userId?: string,
): string {
  const qs = userId ? `&userId=${encodeURIComponent(userId)}` : '';
  return `/admin/ai-usage/${base}?range=${range}${qs}`;
}
