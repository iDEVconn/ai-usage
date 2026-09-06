import type { ReactNode } from 'react';
import type { AiUsageTimeseriesPoint } from '../types';

export interface AiUsageChartDataState {
  points: AiUsageTimeseriesPoint[];
  isEmpty: boolean;
}

export interface AiUsageChartDataProps {
  points: AiUsageTimeseriesPoint[] | undefined;
  loading: boolean;
  children: (state: AiUsageChartDataState) => ReactNode;
}

export function AiUsageChartData({ points, loading, children }: AiUsageChartDataProps): ReactNode {
  const resolved = points ?? [];
  const isEmpty = !loading && resolved.length === 0;
  return children({ points: resolved, isEmpty });
}
