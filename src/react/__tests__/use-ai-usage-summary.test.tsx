import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAiUsageSummary } from '../use-ai-usage-summary';
import type { AiUsageSummary } from '../../types';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAiUsageSummary', () => {
  it('calls fetchFn with the summary URL and returns its data', async () => {
    const summary: AiUsageSummary = {
      total_calls: 5,
      total_input_tokens: 50,
      total_output_tokens: 60,
      success_count: 5,
      error_count: 0,
      by_provider: [],
      by_operation: [],
      by_key_source: [],
      by_user: [],
    };
    const fetchFn = vi.fn().mockResolvedValue(summary);

    const { result } = renderHook(() => useAiUsageSummary('7d', undefined, { fetchFn }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFn).toHaveBeenCalledWith('/admin/ai-usage/summary?range=7d');
    expect(result.current.data).toEqual(summary);
  });

  it('includes userId in the fetched URL when provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      total_calls: 0,
      total_input_tokens: 0,
      total_output_tokens: 0,
      success_count: 0,
      error_count: 0,
      by_provider: [],
      by_operation: [],
      by_key_source: [],
      by_user: [],
    });

    const { result } = renderHook(() => useAiUsageSummary('24h', 'user-1', { fetchFn }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFn).toHaveBeenCalledWith('/admin/ai-usage/summary?range=24h&userId=user-1');
  });
});
