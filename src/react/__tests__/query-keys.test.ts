import { describe, it, expect } from 'vitest';
import {
  AI_USAGE_SUMMARY_QUERY_KEY,
  AI_USAGE_TIMESERIES_QUERY_KEY,
  buildAiUsageQueryPath,
} from '../query-keys';

describe('query keys', () => {
  it('normalizes a missing userId to null', () => {
    expect(AI_USAGE_SUMMARY_QUERY_KEY('7d')).toEqual(['ai-usage', 'summary', '7d', null]);
    expect(AI_USAGE_TIMESERIES_QUERY_KEY('30d')).toEqual(['ai-usage', 'timeseries', '30d', null]);
  });

  it('includes a provided userId', () => {
    expect(AI_USAGE_SUMMARY_QUERY_KEY('7d', 'user-1')).toEqual([
      'ai-usage',
      'summary',
      '7d',
      'user-1',
    ]);
  });
});

describe('buildAiUsageQueryPath', () => {
  it('builds a path without userId', () => {
    expect(buildAiUsageQueryPath('summary', '7d')).toBe('/admin/ai-usage/summary?range=7d');
  });

  it('builds a path with an encoded userId', () => {
    expect(buildAiUsageQueryPath('timeseries', '30d', 'user@example.com')).toBe(
      '/admin/ai-usage/timeseries?range=30d&userId=user%40example.com',
    );
  });
});
