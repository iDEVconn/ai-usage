import { useQuery, keepPreviousData, type UseQueryResult } from '@tanstack/react-query';
import type { AiUsageRange, AiUsageSummary } from '../types';
import { AI_USAGE_SUMMARY_QUERY_KEY, buildAiUsageQueryPath } from './query-keys';

export interface AiUsageFetchOptions {
  fetchFn: (url: string) => Promise<unknown>;
}

export function useAiUsageSummary(
  range: AiUsageRange,
  userId: string | undefined,
  options: AiUsageFetchOptions,
): UseQueryResult<AiUsageSummary> {
  return useQuery<AiUsageSummary>({
    queryKey: AI_USAGE_SUMMARY_QUERY_KEY(range, userId),
    queryFn: () =>
      options.fetchFn(buildAiUsageQueryPath('summary', range, userId)) as Promise<AiUsageSummary>,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
