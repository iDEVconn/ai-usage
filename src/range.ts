import type { AiUsageRange } from './types';

export const VALID_AI_USAGE_RANGES: readonly AiUsageRange[] = ['24h', '7d', '30d', '90d'];

export function parseAiUsageRange(
  raw: string | undefined,
  fallback: AiUsageRange,
): AiUsageRange {
  const value = raw ?? fallback;
  if ((VALID_AI_USAGE_RANGES as readonly string[]).includes(value)) {
    return value as AiUsageRange;
  }
  throw new Error(`Invalid range: ${value}. Valid: 24h | 7d | 30d | 90d`);
}
