import type { ReactNode } from 'react';

export interface AiUsageStatState {
  value: number | string | undefined;
  isEmpty: boolean;
}

export interface AiUsageStatProps {
  loading: boolean;
  value: number | string | undefined;
  children: (state: AiUsageStatState) => ReactNode;
}

export function AiUsageStat({ loading, value, children }: AiUsageStatProps): ReactNode {
  const isEmpty = !loading && (value === undefined || value === null);
  return children({ value: loading ? undefined : value, isEmpty });
}
