import type { AiUsageRange, AiUsageSummary, AiUsageTimeseries } from '../types';

export const AI_USAGE_DATA_SOURCE = Symbol('AI_USAGE_DATA_SOURCE');

export interface AiUsageDataSource {
  getSummary(range: AiUsageRange, userId?: string): Promise<AiUsageSummary>;
  getTimeseries(range: AiUsageRange, userId?: string): Promise<AiUsageTimeseries>;
}
