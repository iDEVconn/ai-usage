import { describe, it, expect } from 'vitest';
import { AiUsageModule, AdminAiUsageController, AI_USAGE_DATA_SOURCE } from '../index';

describe('server entry', () => {
  it('re-exports everything from a single import', () => {
    expect(typeof AiUsageModule).toBe('function');
    expect(typeof AdminAiUsageController).toBe('function');
    expect(typeof AI_USAGE_DATA_SOURCE).toBe('symbol');
  });
});
