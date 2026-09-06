export type AiUsageRange = '24h' | '7d' | '30d' | '90d';

export interface AiUsageRecord {
  timestamp: string;
  provider: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  user_id: string;
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
  date: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface AiUsageTimeseries {
  points: AiUsageTimeseriesPoint[];
}
