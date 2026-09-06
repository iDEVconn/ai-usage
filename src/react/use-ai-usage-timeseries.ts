import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import type { AiUsageRange, AiUsageTimeseries } from '../types';
import { AI_USAGE_TIMESERIES_QUERY_KEY, buildAiUsageQueryPath } from './query-keys';
import type { AiUsageFetchOptions } from './use-ai-usage-summary';

export function useAiUsageTimeseries(
  range: AiUsageRange,
  userId: string | undefined,
  options: AiUsageFetchOptions,
): UseQueryResult<AiUsageTimeseries> {
  return useQuery<AiUsageTimeseries>({
    queryKey: AI_USAGE_TIMESERIES_QUERY_KEY(range, userId),
    queryFn: () =>
      options.fetchFn(
        buildAiUsageQueryPath('timeseries', range, userId),
      ) as Promise<AiUsageTimeseries>,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
