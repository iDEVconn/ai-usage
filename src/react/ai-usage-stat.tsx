import type { ReactNode } from 'react';

export interface AiUsageStatState<V> {
  value: V | undefined;
  isEmpty: boolean;
}

export interface AiUsageStatProps<V> {
  loading: boolean;
  value: V | undefined;
  children: (state: AiUsageStatState<V>) => ReactNode;
}

export function AiUsageStat<V>({ loading, value, children }: AiUsageStatProps<V>): ReactNode {
  const isEmpty = !loading && (value === undefined || value === null);
  return children({ value: loading ? undefined : value, isEmpty });
}
