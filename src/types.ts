export type AiUsageRange = '24h' | '7d' | '30d' | '90d';

/**
 * Canonical shape for a single AI usage event. This package does not
 * consume this type anywhere — it exists so producers (e.g. an LLM
 * client/router) can emit events in a shape any `AiUsageDataSource`
 * implementation can aggregate into `AiUsageSummary`/`AiUsageTimeseries`.
 */
export interface AiUsageRecord {
  /** ISO 8601 timestamp. */
  timestamp: string;
  provider: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  user_id: string;
  /** Host-defined string, e.g. 'platform' | 'byok'. */
  key_source: string;
}

export interface AiUsageBreakdownRow {
  key: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageByUserRow {
  user_id: string;
  /** Host fills this in (e.g. via its own auth service) — this package never looks up emails itself. */
  email: string | null;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageSummary {
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  success_count: number;
  error_count: number;
  by_provider: AiUsageBreakdownRow[];
  by_operation: AiUsageBreakdownRow[];
  by_key_source: AiUsageBreakdownRow[];
  by_user: AiUsageByUserRow[];
}

export interface AiUsageTimeseriesPoint {
  /** ISO date, day granularity. */
  date: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageTimeseries {
  points: AiUsageTimeseriesPoint[];
}
