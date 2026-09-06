import { describe, it, expect } from 'vitest';
import {
  formatNumber,
  formatTokens,
  useAiUsageSummary,
  useAiUsageTimeseries,
  AiUsageStat,
  AiUsageBreakdownTable,
  AiUsageChartData,
} from '../index';

describe('react entry', () => {
  it('re-exports everything from a single import', () => {
    expect(typeof formatNumber).toBe('function');
    expect(typeof formatTokens).toBe('function');
    expect(typeof useAiUsageSummary).toBe('function');
    expect(typeof useAiUsageTimeseries).toBe('function');
    expect(typeof AiUsageStat).toBe('function');
    expect(typeof AiUsageBreakdownTable).toBe('function');
    expect(typeof AiUsageChartData).toBe('function');
  });
});
