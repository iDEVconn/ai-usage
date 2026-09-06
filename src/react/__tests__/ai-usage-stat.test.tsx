import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiUsageStat } from '../ai-usage-stat';

describe('AiUsageStat', () => {
  it('passes the value through and marks non-empty when data is present', () => {
    render(
      <AiUsageStat loading={false} value={42}>
        {({ value, isEmpty }) => (
          <span data-testid="probe">{`${value}:${isEmpty}`}</span>
        )}
      </AiUsageStat>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('42:false');
  });

  it('hides the value and is not empty while loading', () => {
    render(
      <AiUsageStat loading={true} value={42}>
        {({ value, isEmpty }) => (
          <span data-testid="probe">{`${value}:${isEmpty}`}</span>
        )}
      </AiUsageStat>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('undefined:false');
  });

  it('marks empty when not loading and value is undefined', () => {
    render(
      <AiUsageStat loading={false} value={undefined}>
        {({ value, isEmpty }) => (
          <span data-testid="probe">{`${value}:${isEmpty}`}</span>
        )}
      </AiUsageStat>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('undefined:true');
  });
});
