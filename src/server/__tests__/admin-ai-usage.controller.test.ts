import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AdminAiUsageController } from '../admin-ai-usage.controller';
import type { AiUsageDataSource } from '../ai-usage-data-source';
import type { AiUsageSummary, AiUsageTimeseries } from '../../types';

function makeDataSource(): AiUsageDataSource {
  const summary = {} as unknown as AiUsageSummary;
  const timeseries = { points: [] } as AiUsageTimeseries;
  return {
    getSummary: vi.fn().mockResolvedValue(summary),
    getTimeseries: vi.fn().mockResolvedValue(timeseries),
  };
}

describe('AdminAiUsageController', () => {
  it('defaults the summary range to 7d', async () => {
    const dataSource = makeDataSource();
    const controller = new AdminAiUsageController(dataSource);

    await controller.summary(undefined, undefined);

    expect(dataSource.getSummary).toHaveBeenCalledWith('7d', undefined);
  });

  it('defaults the timeseries range to 30d', async () => {
    const dataSource = makeDataSource();
    const controller = new AdminAiUsageController(dataSource);

    await controller.timeseries(undefined, undefined);

    expect(dataSource.getTimeseries).toHaveBeenCalledWith('30d', undefined);
  });

  it('passes an explicit range and userId through', async () => {
    const dataSource = makeDataSource();
    const controller = new AdminAiUsageController(dataSource);

    await controller.summary('24h', 'user-1');

    expect(dataSource.getSummary).toHaveBeenCalledWith('24h', 'user-1');
  });

  it('throws BadRequestException on an invalid range', async () => {
    const dataSource = makeDataSource();
    const controller = new AdminAiUsageController(dataSource);

    await expect(controller.summary('bogus', undefined)).rejects.toThrow(BadRequestException);
    await expect(controller.summary('bogus', undefined)).rejects.toThrow(
      'Invalid range: bogus. Valid: 24h | 7d | 30d | 90d',
    );
  });

  it('returns the data source summary unchanged, including full_name (pass-through, no dropped fields)', async () => {
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
        },
      ],
    };
    const dataSource: AiUsageDataSource = {
      getSummary: vi.fn().mockResolvedValue(summary),
      getTimeseries: vi.fn().mockResolvedValue({ points: [] }),
    };
    const controller = new AdminAiUsageController(dataSource);

    const result = await controller.summary(undefined, undefined);

    expect(result.by_user[0]?.full_name).toBe('User One');
    expect(result).toBe(summary);
  });
});
