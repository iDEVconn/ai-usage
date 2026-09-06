import { describe, it, expect } from 'vitest';
import { VALID_AI_USAGE_RANGES, parseAiUsageRange } from '../range';

describe('VALID_AI_USAGE_RANGES', () => {
  it('lists the four supported ranges', () => {
    expect(VALID_AI_USAGE_RANGES).toEqual(['24h', '7d', '30d', '90d']);
  });
});

describe('parseAiUsageRange', () => {
  it('returns the fallback when raw is undefined', () => {
    expect(parseAiUsageRange(undefined, '7d')).toBe('7d');
  });

  it('returns a valid raw value as-is', () => {
    expect(parseAiUsageRange('30d', '7d')).toBe('30d');
  });

  it('throws on an invalid range', () => {
    expect(() => parseAiUsageRange('bogus', '7d')).toThrow(
      'Invalid range: bogus. Valid: 24h | 7d | 30d | 90d',
    );
  });
});
