import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CalendarHeatmap } from '@/components/CalendarHeatmap';

describe('CalendarHeatmap', () => {
  it('defaults to recent activity and switches to a selected year', async () => {
    const user = userEvent.setup();

    render(
      <CalendarHeatmap
        recentDays={[
          { date: new Date('2026-04-20T00:00:00.000Z'), label: 'Apr 20, 2026', gameCount: 0 },
          { date: new Date('2026-04-21T00:00:00.000Z'), label: 'Apr 21, 2026', gameCount: 2 },
        ]}
        recentRangeLabel="Apr 20, 2026 - Apr 21, 2026"
        years={[
          {
            year: 2026,
            totalGames: 3,
            days: [
              { date: new Date('2026-04-20T00:00:00.000Z'), label: 'Apr 20, 2026', gameCount: 1 },
              { date: new Date('2026-04-21T00:00:00.000Z'), label: 'Apr 21, 2026', gameCount: 2 },
            ],
          },
          {
            year: 2025,
            totalGames: 2,
            days: [
              { date: new Date('2025-12-30T00:00:00.000Z'), label: 'Dec 30, 2025', gameCount: 0 },
              { date: new Date('2025-12-31T00:00:00.000Z'), label: 'Dec 31, 2025', gameCount: 2 },
            ],
          },
        ]}
        defaultSelection="recent"
      />,
    );

    expect(screen.getByRole('button', { name: 'Last 12 Months' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByText('Apr 20, 2026 - Apr 21, 2026')).toBeInTheDocument();

    const zeroDay = screen.getByRole('button', { name: 'Apr 20, 2026: 0 games' });
    const activeDay = screen.getByRole('button', { name: 'Apr 21, 2026: 2 games' });

    expect(zeroDay).toHaveAttribute('data-intensity', '0');
    expect(activeDay).toHaveAttribute('data-intensity', '4');

    await user.hover(activeDay);

    expect(screen.getByText('Apr 21, 2026')).toBeInTheDocument();
    expect(screen.getByText('2 games')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '2025' }));
    await user.hover(screen.getByRole('button', { name: 'Dec 31, 2025: 2 games' }));

    expect(screen.getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Dec 31, 2025')).toBeInTheDocument();
  });

  it('renders an empty state with no recorded days', () => {
    render(
      <CalendarHeatmap
        recentDays={[]}
        recentRangeLabel={null}
        years={[]}
        defaultSelection="recent"
      />,
    );

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument();
  });
});
