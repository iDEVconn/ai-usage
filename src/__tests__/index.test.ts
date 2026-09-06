import { describe, it, expect } from 'vitest';
import { VALID_AI_USAGE_RANGES, parseAiUsageRange } from '../index';
import type { AiUsageRecord, AiUsageSummary, AiUsageTimeseries } from '../index';

describe('root entry', () => {
  it('re-exports range utilities', () => {
    expect(VALID_AI_USAGE_RANGES).toContain('7d');
    expect(parseAiUsageRange('90d', '7d')).toBe('90d');
  });

  it('re-exports domain types (compile-time check)', () => {
    const record: AiUsageRecord = {
      timestamp: new Date().toISOString(),
      provider: 'openai',
      operation: 'chat',
      input_tokens: 10,
      output_tokens: 20,
      success: true,
      user_id: 'user-1',
      key_source: 'platform',
    };
    const summary: AiUsageSummary = {
      total_calls: 1,
      total_input_tokens: 10,
      total_output_tokens: 20,
      success_count: 1,
      error_count: 0,
      by_provider: [],
      by_operation: [],
      by_key_source: [],
      by_user: [],
    };
    const timeseries: AiUsageTimeseries = { points: [] };

    expect(record.provider).toBe('openai');
    expect(summary.total_calls).toBe(1);
    expect(timeseries.points).toHaveLength(0);
  });
});
