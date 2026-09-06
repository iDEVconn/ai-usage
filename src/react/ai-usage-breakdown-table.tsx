import type { ReactNode } from 'react';

export interface AiUsageBreakdownTableState<Row> {
  rows: Row[];
  isEmpty: boolean;
}

export interface AiUsageBreakdownTableProps<Row> {
  rows: Row[] | undefined;
  loading: boolean;
  children: (state: AiUsageBreakdownTableState<Row>) => ReactNode;
}

export function AiUsageBreakdownTable<Row>({
  rows,
  loading,
  children,
}: AiUsageBreakdownTableProps<Row>): ReactNode {
  const resolved = rows ?? [];
  const isEmpty = !loading && resolved.length === 0;
  return children({ rows: resolved, isEmpty });
}
