import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAiUsageTimeseries } from '../use-ai-usage-timeseries';
import type { AiUsageTimeseries } from '../../types';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useAiUsageTimeseries', () => {
  it('calls fetchFn with the timeseries URL and returns its data', async () => {
    const timeseries: AiUsageTimeseries = { points: [{ date: '2026-09-01', calls: 3, input_tokens: 30, output_tokens: 40 }] };
    const fetchFn = vi.fn().mockResolvedValue(timeseries);

    const { result } = renderHook(() => useAiUsageTimeseries('30d', undefined, { fetchFn }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFn).toHaveBeenCalledWith('/admin/ai-usage/timeseries?range=30d');
    expect(result.current.data).toEqual(timeseries);
  });

  it('includes userId in the fetched URL when provided', async () => {
    const fetchFn = vi.fn().mockResolvedValue({ points: [] });

    const { result } = renderHook(() => useAiUsageTimeseries('90d', 'user-2', { fetchFn }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchFn).toHaveBeenCalledWith('/admin/ai-usage/timeseries?range=90d&userId=user-2');
  });
});
