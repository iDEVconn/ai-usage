import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiUsageChartData } from '../ai-usage-chart-data';

describe('AiUsageChartData', () => {
  it('normalizes missing points to an empty array and marks empty', () => {
    render(
      <AiUsageChartData points={undefined} loading={false}>
        {({ points, isEmpty }) => (
          <span data-testid="probe">{`${points.length}:${isEmpty}`}</span>
        )}
      </AiUsageChartData>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('0:true');
  });

  it('is not empty while loading', () => {
    render(
      <AiUsageChartData points={undefined} loading={true}>
        {({ points, isEmpty }) => (
          <span data-testid="probe">{`${points.length}:${isEmpty}`}</span>
        )}
      </AiUsageChartData>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('0:false');
  });

  it('passes points through unchanged when present', () => {
    const points = [{ date: '2026-09-01', calls: 3, input_tokens: 30, output_tokens: 40 }];
    render(
      <AiUsageChartData points={points} loading={false}>
        {({ points: passed, isEmpty }) => (
          <span data-testid="probe">{`${passed.length}:${isEmpty}:${passed[0]?.date}`}</span>
        )}
      </AiUsageChartData>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('1:false:2026-09-01');
  });
});
