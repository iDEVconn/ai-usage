import { describe, it, expect } from 'vitest';
import { VALID_AI_USAGE_RANGES, parseAiUsageRange } from '../index';
import type { AiUsageByUserRow, AiUsageRecord, AiUsageSummary, AiUsageTimeseries } from '../index';

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
      cost_usd: 0.0042,
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
      by_user: [
        {
          user_id: 'user-1',
          email: 'user-1@example.com',
          full_name: 'User One',
          calls: 1,
          input_tokens: 10,
          output_tokens: 20,
          total_cost_usd: 0.0042,
        },
      ],
      total_cost_usd: 0.0042,
    };
    const timeseries: AiUsageTimeseries = { points: [] };

    expect(record.provider).toBe('openai');
    expect(record.cost_usd).toBe(0.0042);
    expect(summary.total_calls).toBe(1);
    expect(summary.total_cost_usd).toBe(0.0042);
    expect(timeseries.points).toHaveLength(0);
  });

  it('accepts a record without cost_usd (producer that does not know cost)', () => {
    const record: AiUsageRecord = {
      timestamp: new Date().toISOString(),
      provider: 'openai',
      operation: 'chat',
      input_tokens: 10,
      output_tokens: 20,
      success: true,
      user_id: 'user-1',
      key_source: 'byok',
    };

    expect(record.cost_usd).toBeUndefined();
  });

  it('accepts a by_user row with full_name set (host has a display name)', () => {
    const row: AiUsageByUserRow = {
      user_id: 'user-1',
      email: 'user-1@example.com',
      full_name: 'User One',
      calls: 1,
      input_tokens: 10,
      output_tokens: 20,
    };

    expect(row.full_name).toBe('User One');
  });

  it('accepts a by_user row with full_name: null (host knows the user has none)', () => {
    const row: AiUsageByUserRow = {
      user_id: 'user-1',
      email: 'user-1@example.com',
      full_name: null,
      calls: 1,
      input_tokens: 10,
      output_tokens: 20,
    };

    expect(row.full_name).toBeNull();
  });

  it('accepts a by_user row with full_name omitted (host has no such data at all)', () => {
    const row: AiUsageByUserRow = {
      user_id: 'user-1',
      email: 'user-1@example.com',
      calls: 1,
      input_tokens: 10,
      output_tokens: 20,
    };

    expect(row.full_name).toBeUndefined();
  });
});
