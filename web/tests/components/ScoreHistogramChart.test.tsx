import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScoreHistogramChart } from '@/components/ScoreHistogramChart';

describe('ScoreHistogramChart', () => {
  it('reveals bucket details on hover and focus', async () => {
    const user = userEvent.setup();

    render(
      <ScoreHistogramChart
        buckets={[
          { score: 5, count: 1 },
          { score: 6, count: 3 },
          { score: 7, count: 2 },
        ]}
      />,
    );

    const detailSlot = screen.getByTestId('stats-card-detail-slot');

    expect(detailSlot).toHaveAttribute('data-detail-size', 'compact');
    expect(screen.getByText('Hover over a bar to inspect a score bucket.')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    const sixPointBucket = screen.getByRole('button', {
      name: '6 VP: 3 games, 50.0% of recorded scores',
    });

    await user.hover(sixPointBucket);

    expect(within(detailSlot).getByText('6 VP')).toBeInTheDocument();
    expect(within(detailSlot).getByText('3 games (50.0%)')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Score histogram' }));
    expect(screen.getByText('Hover over a bar to inspect a score bucket.')).toBeInTheDocument();

    fireEvent.focus(sixPointBucket);
    expect(within(detailSlot).getByText('3 games (50.0%)')).toBeInTheDocument();
    fireEvent.blur(sixPointBucket);
    expect(screen.getByText('Hover over a bar to inspect a score bucket.')).toBeInTheDocument();
  });

  it('renders an empty state with no buckets', () => {
    render(<ScoreHistogramChart buckets={[]} />);

    expect(screen.getByText('No scores recorded yet.')).toBeInTheDocument();
  });
});
