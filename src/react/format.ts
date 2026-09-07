export function formatNumber(
  value: number | undefined,
  locale: Intl.LocalesArgument = 'en-US',
): string {
  if (value === undefined) return '—';
  return new Intl.NumberFormat(locale).format(value);
}

export function formatTokens(value: number | undefined): string {
  if (value === undefined) return '—';
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}K`;
  return `${(value / 1_000_000).toFixed(1)}M`;
}

export function formatCost(
  value: number | undefined,
  opts?: { currency?: string; locale?: Intl.LocalesArgument },
): string {
  if (value === undefined) return '—';
  // LLM calls often cost fractions of a cent — 2 decimals would show "$0.00"
  // for every such call, so small positive amounts get more precision.
  const fractionDigits = value > 0 && value < 0.01 ? 4 : 2;
  return new Intl.NumberFormat(opts?.locale ?? 'en-US', {
    style: 'currency',
    currency: opts?.currency ?? 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}
