import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { GamesOverTimeChart } from '@/components/GamesOverTimeChart';

describe('GamesOverTimeChart', () => {
  it('shows axis markers and reveals bucket details on hover', async () => {
    const user = userEvent.setup();

    render(
      <GamesOverTimeChart
        weekly={[
          { bucketStart: new Date('2026-04-07T00:00:00.000Z'), label: 'Apr 7', gameCount: 2 },
          { bucketStart: new Date('2026-04-14T00:00:00.000Z'), label: 'Apr 14', gameCount: 3 },
          { bucketStart: new Date('2026-04-21T00:00:00.000Z'), label: 'Apr 21', gameCount: 1 },
        ]}
        monthly={[
          { bucketStart: new Date('2026-03-01T00:00:00.000Z'), label: 'Mar 2026', gameCount: 4 },
          { bucketStart: new Date('2026-04-01T00:00:00.000Z'), label: 'Apr 2026', gameCount: 5 },
        ]}
        defaultView="week"
      />,
    );

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Apr 7')).toBeInTheDocument();
    expect(screen.getByText('Apr 21')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Hover over a data point to inspect its bucket.')).toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Apr 7: 2 games' }));

    expect(screen.getByText('2 games')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Month' }));

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Hover over a data point to inspect its bucket.')).toBeInTheDocument();
    expect(screen.queryByText('Apr 7')).not.toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Mar 2026: 4 games' }));

    expect(screen.getAllByText('Mar 2026')).toHaveLength(2);
    expect(screen.getByText('4 games')).toBeInTheDocument();
  });
});
