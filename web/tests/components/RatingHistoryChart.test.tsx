import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RatingHistoryChart } from '@/components/RatingHistoryChart';
import { PlayerTier } from '@/lib/player-tier';

const player = {
  playerId: 1,
  name: 'Ada',
  tier: PlayerTier.Premium,
  rating: 1512,
  displayRating: 1512,
  peakRating: 1512,
  lastGameChange: 12,
  gamesPlayed: 1,
  provisional: true,
  history: [
    {
      gameId: 1,
      sequence: 0,
      playedAt: '2026-01-01T00:00:00.000Z',
      rating: 1512,
      change: 12,
      participated: true,
    },
  ],
};

describe('RatingHistoryChart', () => {
  it('renders an accessible empty state', () => {
    render(<RatingHistoryChart players={[]} />);
    expect(screen.getByText('No rated multiplayer games yet.')).toBeInTheDocument();
  });

  it('exposes focusable points and updates their detail on focus', () => {
    render(<RatingHistoryChart players={[player]} />);
    expect(
      screen.getByRole('group', { name: 'Multiplayer Elo rating history' }),
    ).toBeInTheDocument();
    const point = screen.getByRole('button', { name: /Ada, Jan 1, 1512 Elo, \+12\.0/i });
    fireEvent.focus(point);
    expect(screen.getByText(/Ada · Jan 1/)).toBeInTheDocument();
    expect(screen.getByText(/1512 Elo · \+12\.0/)).toBeInTheDocument();
  });

  it('gives five series distinct stroke patterns in the chart and legend', () => {
    const players = Array.from({ length: 5 }, (_, index) => ({
      ...player,
      playerId: index + 1,
      name: `Player ${index + 1}`,
    }));
    const { container } = render(<RatingHistoryChart players={players} />);
    const chartLines = [...container.querySelectorAll('polyline')].map(
      (line) => line.getAttribute('stroke-dasharray') ?? 'solid',
    );
    expect(new Set(chartLines).size).toBe(5);
    expect(screen.getByLabelText('Rating history legend')).toHaveTextContent('Player 5');
  });
});
