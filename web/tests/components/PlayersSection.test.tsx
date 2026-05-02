import { render, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayersSection } from '@/components/PlayersSection';
import { PlayerTier } from '@/lib/player-tier';
import type { Player } from '@/lib/players';
import type { PlayerHeadToHeadRecord } from '@/lib/stats';

const createdAt = new Date('2026-01-01T12:00:00.000Z');

const players: Player[] = [
  {
    id: 1,
    name: 'Ada',
    tier: PlayerTier.Premium,
    createdAt,
  },
  {
    id: 2,
    name: 'Bea',
    tier: PlayerTier.Standard,
    createdAt,
  },
  {
    id: 3,
    name: 'Cara',
    tier: PlayerTier.Standard,
    createdAt,
  },
];

function renderPlayersSection(headToHeadRecords: PlayerHeadToHeadRecord[]) {
  render(
    <PlayersSection
      players={players}
      selectedPlayer={players[0]}
      mobileMode="list"
      scoreStats={[]}
      scoreDistributions={[]}
      cumulativeScoreStats={[]}
      podiumRates={[]}
      finishBreakdowns={[]}
      marginStats={[]}
      participationRates={[]}
      winRateByGameSize={[]}
      expectedVsActualWins={[]}
      currentWinStreaks={[]}
      playerWinEvents={[]}
      playerStreakRecords={[]}
      playerGames={[]}
      headToHeadRecords={headToHeadRecords}
    />,
  );
}

describe('PlayersSection head-to-head cards', () => {
  it('renders the top head-to-head opponents and links to their player pages', () => {
    renderPlayersSection([
      {
        playerId: 1,
        playerName: 'Ada',
        playerTier: PlayerTier.Premium,
        opponentId: 2,
        opponentName: 'Bea',
        opponentTier: PlayerTier.Standard,
        gamesTogether: 5,
        winsAgainstOpponent: 3,
        lossesToOpponent: 1,
        timesOutscoredOpponent: 4,
        timesOutscoredByOpponent: 1,
      },
      {
        playerId: 1,
        playerName: 'Ada',
        playerTier: PlayerTier.Premium,
        opponentId: 3,
        opponentName: 'Cara',
        opponentTier: PlayerTier.Standard,
        gamesTogether: 4,
        winsAgainstOpponent: 1,
        lossesToOpponent: 2,
        timesOutscoredOpponent: 2,
        timesOutscoredByOpponent: 2,
      },
    ]);

    const mostPlayedWithCard = document.getElementById('player-most-played-with');
    const nemesisCard = document.getElementById('player-nemesis');
    const favoriteOpponentCard = document.getElementById('player-favorite-opponent');

    expect(mostPlayedWithCard).not.toBeNull();
    expect(nemesisCard).not.toBeNull();
    expect(favoriteOpponentCard).not.toBeNull();

    expect(within(mostPlayedWithCard as HTMLElement).getByRole('link', { name: 'Bea' })).toHaveAttribute(
      'href',
      '/players/2',
    );
    expect(within(mostPlayedWithCard as HTMLElement).getByText('5 shared games')).toBeInTheDocument();

    expect(within(nemesisCard as HTMLElement).getByRole('link', { name: 'Cara' })).toHaveAttribute(
      'href',
      '/players/3',
    );
    expect(within(nemesisCard as HTMLElement).getByText('2 losses across 4 shared games')).toBeInTheDocument();

    expect(
      within(favoriteOpponentCard as HTMLElement).getByRole('link', { name: 'Bea' }),
    ).toHaveAttribute('href', '/players/2');
    expect(
      within(favoriteOpponentCard as HTMLElement).getByText('3 wins across 5 shared games'),
    ).toBeInTheDocument();
  });

  it('renders the empty state for each head-to-head card when no qualifying opponent exists', () => {
    renderPlayersSection([
      {
        playerId: 1,
        playerName: 'Ada',
        playerTier: PlayerTier.Premium,
        opponentId: 2,
        opponentName: 'Bea',
        opponentTier: PlayerTier.Standard,
        gamesTogether: 0,
        winsAgainstOpponent: 0,
        lossesToOpponent: 0,
        timesOutscoredOpponent: 0,
        timesOutscoredByOpponent: 0,
      },
    ]);

    ['player-most-played-with', 'player-nemesis', 'player-favorite-opponent'].forEach((id) => {
      const card = document.getElementById(id);
      expect(card).not.toBeNull();
      expect(within(card as HTMLElement).getByText('No games recorded yet.')).toBeInTheDocument();
    });
  });

  it('breaks most-played-with ties alphabetically', () => {
    renderPlayersSection([
      {
        playerId: 1,
        playerName: 'Ada',
        playerTier: PlayerTier.Premium,
        opponentId: 3,
        opponentName: 'Cara',
        opponentTier: PlayerTier.Standard,
        gamesTogether: 2,
        winsAgainstOpponent: 1,
        lossesToOpponent: 0,
        timesOutscoredOpponent: 1,
        timesOutscoredByOpponent: 0,
      },
      {
        playerId: 1,
        playerName: 'Ada',
        playerTier: PlayerTier.Premium,
        opponentId: 2,
        opponentName: 'Bea',
        opponentTier: PlayerTier.Standard,
        gamesTogether: 2,
        winsAgainstOpponent: 1,
        lossesToOpponent: 1,
        timesOutscoredOpponent: 1,
        timesOutscoredByOpponent: 1,
      },
    ]);

    const mostPlayedWithCard = document.getElementById('player-most-played-with');

    expect(mostPlayedWithCard).not.toBeNull();
    expect(within(mostPlayedWithCard as HTMLElement).getByRole('link', { name: 'Bea' })).toHaveAttribute(
      'href',
      '/players/2',
    );
    expect(within(mostPlayedWithCard as HTMLElement).getByText('2 shared games')).toBeInTheDocument();
  });
});
