import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeadToHeadMatrix } from '@/components/HeadToHeadMatrix';
import { PlayerTier } from '@/lib/player-tier';
import type { PlayerIdentity, PlayerHeadToHeadRecord } from '@/lib/stats';

const players: PlayerIdentity[] = [
  {
    playerId: 1,
    name: 'Ada',
    tier: PlayerTier.Premium,
  },
  {
    playerId: 2,
    name: 'Bea',
    tier: PlayerTier.Standard,
  },
  {
    playerId: 3,
    name: 'Cara',
    tier: PlayerTier.Standard,
  },
];

const records: PlayerHeadToHeadRecord[] = [
  {
    playerId: 1,
    playerName: 'Ada',
    playerTier: PlayerTier.Premium,
    opponentId: 2,
    opponentName: 'Bea',
    opponentTier: PlayerTier.Standard,
    gamesTogether: 5,
    winsAgainstOpponent: 3,
    lossesToOpponent: 2,
    timesOutscoredOpponent: 4,
    timesOutscoredByOpponent: 1,
  },
  {
    playerId: 2,
    playerName: 'Bea',
    playerTier: PlayerTier.Standard,
    opponentId: 1,
    opponentName: 'Ada',
    opponentTier: PlayerTier.Premium,
    gamesTogether: 5,
    winsAgainstOpponent: 2,
    lossesToOpponent: 3,
    timesOutscoredOpponent: 1,
    timesOutscoredByOpponent: 4,
  },
  {
    playerId: 1,
    playerName: 'Ada',
    playerTier: PlayerTier.Premium,
    opponentId: 3,
    opponentName: 'Cara',
    opponentTier: PlayerTier.Standard,
    gamesTogether: 2,
    winsAgainstOpponent: 1,
    lossesToOpponent: 1,
    timesOutscoredOpponent: 1,
    timesOutscoredByOpponent: 1,
  },
  {
    playerId: 3,
    playerName: 'Cara',
    playerTier: PlayerTier.Standard,
    opponentId: 1,
    opponentName: 'Ada',
    opponentTier: PlayerTier.Premium,
    gamesTogether: 2,
    winsAgainstOpponent: 1,
    lossesToOpponent: 1,
    timesOutscoredOpponent: 1,
    timesOutscoredByOpponent: 1,
  },
];

describe('HeadToHeadMatrix', () => {
  it('renders three row headers and three column headers for a three-player matrix', () => {
    render(<HeadToHeadMatrix records={records} players={players} />);

    const table = screen.getByRole('table', { name: 'Head-to-head matrix' });
    const [thead, tbody] = within(table).getAllByRole('rowgroup');

    expect(within(thead).getAllByRole('columnheader')).toHaveLength(4);
    expect(within(tbody).getAllByRole('rowheader')).toHaveLength(3);
    expect(within(thead).getByRole('columnheader', { name: 'Ada' })).toBeInTheDocument();
    expect(within(thead).getByRole('columnheader', { name: 'Bea' })).toBeInTheDocument();
    expect(within(thead).getByRole('columnheader', { name: 'Cara' })).toBeInTheDocument();
  });

  it('renders a placeholder in diagonal cells', () => {
    render(<HeadToHeadMatrix records={records} players={players} />);

    expect(screen.getByTestId('head-to-head-cell-1-1')).toHaveTextContent('—');
    expect(screen.getByTestId('head-to-head-cell-2-2')).toHaveTextContent('—');
    expect(screen.getByTestId('head-to-head-cell-3-3')).toHaveTextContent('—');
  });

  it('renders directional win-loss counts in the correct cells', () => {
    render(<HeadToHeadMatrix records={records} players={players} />);

    expect(screen.getByTestId('head-to-head-cell-1-2')).toHaveTextContent('3-2');
    expect(screen.getByTestId('head-to-head-cell-2-1')).toHaveTextContent('2-3');
    expect(screen.getByTestId('head-to-head-cell-1-3')).toHaveTextContent('1-1');
  });

  it('renders the outscored line for populated matchups', () => {
    render(<HeadToHeadMatrix records={records} players={players} />);

    expect(within(screen.getByTestId('head-to-head-cell-1-2')).getByText('Outscored: 4/5')).toBeInTheDocument();
    expect(within(screen.getByTestId('head-to-head-cell-1-3')).getByText('Outscored: 1/2')).toBeInTheDocument();
  });
});
