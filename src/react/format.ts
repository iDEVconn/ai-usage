export function formatNumber(value: number | undefined): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat('en-US').format(value);
}

export function formatTokens(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}
