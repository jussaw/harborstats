import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RivalryCard } from '@/components/RivalryCard';
import { PlayerTier } from '@/lib/player-tier';

describe('RivalryCard', () => {
  const pair = {
    playerA: {
      playerId: 7,
      name: 'Ada',
      tier: PlayerTier.Premium,
    },
    playerB: {
      playerId: 12,
      name: 'Bea',
      tier: PlayerTier.Standard,
    },
    gamesTogether: 14,
    playerAWins: 8,
    playerBWins: 6,
    decidedGames: 14,
    closenessScore: 0.913,
  };

  it('renders both linked player names and the record text when a pair exists', () => {
    render(
      <RivalryCard
        title="Closest Rivalry"
        description="Tightest record in the room."
        badge="Spotlight"
        pair={pair}
        emptyMessage="No rivalry yet."
      />,
    );

    expect(screen.getByRole('link', { name: 'Ada' })).toHaveAttribute('href', '/players/7');
    expect(screen.getByRole('link', { name: 'Bea' })).toHaveAttribute('href', '/players/12');
    expect(screen.getByText('8 wins - 6 losses')).toBeInTheDocument();
  });

  it('renders the empty message when pair is null', () => {
    render(
      <RivalryCard
        title="Closest Rivalry"
        description="Tightest record in the room."
        pair={null}
        emptyMessage="No rivalry yet."
      />,
    );

    expect(screen.getByText('No rivalry yet.')).toBeInTheDocument();
  });

  it('displays the games-together count and tier detail line', () => {
    render(
      <RivalryCard
        title="Closest Rivalry"
        description="Tightest record in the room."
        pair={pair}
        emptyMessage="No rivalry yet."
      />,
    );

    expect(screen.getByTestId('stats-card-detail-slot')).toHaveAttribute(
      'data-detail-size',
      'roomy',
    );
    expect(screen.getByText('14 games together')).toBeInTheDocument();
    expect(screen.getByText('Premium vs Standard')).toBeInTheDocument();
  });
});
