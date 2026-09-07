import { describe, it, expect } from 'vitest';
import { formatNumber, formatTokens, formatCost } from '../format';

describe('formatNumber', () => {
  it('returns an em dash for undefined', () => {
    expect(formatNumber(undefined)).toBe('—');
  });

  it('formats zero as 0', () => {
    expect(formatNumber(0)).toBe('0');
  });

  it('adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });

  it('accepts a locale override', () => {
    expect(formatNumber(1234567, 'ru-RU')).toBe('1 234 567');
    expect(formatNumber(1234567, 'he-IL')).toBe('1,234,567');
  });
});

describe('formatTokens', () => {
  it('returns an em dash for undefined', () => {
    expect(formatTokens(undefined)).toBe('—');
  });

  it('returns small values unchanged', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
  });

  it('abbreviates thousands with one decimal', () => {
    expect(formatTokens(12345)).toBe('12.3K');
  });

  it('abbreviates millions with one decimal', () => {
    expect(formatTokens(2_500_000)).toBe('2.5M');
  });
});

describe('formatCost', () => {
  it('returns an em dash for undefined', () => {
    expect(formatCost(undefined)).toBe('—');
  });

  it('formats a regular amount with 2 decimals', () => {
    expect(formatCost(1.234)).toBe('$1.23');
  });

  it('formats zero as $0.00', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it('does not collapse sub-cent amounts to $0.00', () => {
    const result = formatCost(0.0023);
    expect(result).not.toBe('$0.00');
    expect(result).toBe('$0.0023');
  });

  it('accepts a currency override', () => {
    expect(formatCost(1.5, { currency: 'EUR' })).toBe('€1.50');
  });

  it('accepts a locale override', () => {
    expect(formatCost(1234.5, { locale: 'ru-RU' })).toBe('1 234,50 $');
  });
});
