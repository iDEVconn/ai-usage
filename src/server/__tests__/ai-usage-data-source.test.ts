import { describe, it, expect } from 'vitest';
import { AI_USAGE_DATA_SOURCE } from '../ai-usage-data-source';

describe('AI_USAGE_DATA_SOURCE', () => {
  it('is a unique symbol usable as a DI token', () => {
    expect(typeof AI_USAGE_DATA_SOURCE).toBe('symbol');
    expect(AI_USAGE_DATA_SOURCE.toString()).toBe('Symbol(AI_USAGE_DATA_SOURCE)');
  });
});
