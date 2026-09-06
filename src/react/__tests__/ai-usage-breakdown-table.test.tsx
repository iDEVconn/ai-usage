import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AiUsageBreakdownTable } from '../ai-usage-breakdown-table';

interface Row {
  key: string;
  calls: number;
}

describe('AiUsageBreakdownTable', () => {
  it('normalizes missing rows to an empty array and marks empty', () => {
    render(
      <AiUsageBreakdownTable<Row> rows={undefined} loading={false}>
        {({ rows, isEmpty }) => (
          <span data-testid="probe">{`${rows.length}:${isEmpty}`}</span>
        )}
      </AiUsageBreakdownTable>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('0:true');
  });

  it('is not empty while loading even with no rows yet', () => {
    render(
      <AiUsageBreakdownTable<Row> rows={undefined} loading={true}>
        {({ rows, isEmpty }) => (
          <span data-testid="probe">{`${rows.length}:${isEmpty}`}</span>
        )}
      </AiUsageBreakdownTable>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('0:false');
  });

  it('passes rows through unchanged when present', () => {
    const rows: Row[] = [{ key: 'openai', calls: 3 }];
    render(
      <AiUsageBreakdownTable<Row> rows={rows} loading={false}>
        {({ rows: passed, isEmpty }) => (
          <span data-testid="probe">{`${passed.length}:${isEmpty}:${passed[0]?.key}`}</span>
        )}
      </AiUsageBreakdownTable>,
    );
    expect(screen.getByTestId('probe')).toHaveTextContent('1:false:openai');
  });
});
