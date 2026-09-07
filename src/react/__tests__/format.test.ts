import { describe, it, expect } from 'vitest';
import { formatNumber, formatTokens } from '../format';

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
