import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerOfMonthHistoryTable } from '@/components/PlayerOfMonthHistoryTable'
import { PlayerTier } from '@/lib/player-tier'

const players = [
  {
    playerId: 1,
    name: 'Ada',
    tier: PlayerTier.Premium,
    streak: 0,
    mostRecentAppearance: null,
    mostRecentWin: null,
  },
  {
    playerId: 2,
    name: 'Bea',
    tier: PlayerTier.Standard,
    streak: 0,
    mostRecentAppearance: null,
    mostRecentWin: null,
  },
]

describe('PlayerOfMonthHistoryTable', () => {
  it('renders rows in descending month order', () => {
    render(
      <PlayerOfMonthHistoryTable
        players={players}
        winEvents={[
          { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, playedAt: '2026-03-10T18:00:00.000Z' },
          { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, playedAt: '2026-03-20T18:00:00.000Z' },
          { playerId: 2, name: 'Bea', tier: PlayerTier.Standard, playedAt: '2026-04-05T18:00:00.000Z' },
        ]}
        timeZone="America/New_York"
        now={new Date('2026-05-15T12:00:00.000Z')}
      />,
    )

    const rows = screen.getAllByRole('row')
    // rows[0] is the header; rows[1] is most recent month
    expect(rows[1]).toHaveTextContent('Apr 2026')
    expect(rows[2]).toHaveTextContent('Mar 2026')
  })

  it('shows the win count for each month winner', () => {
    render(
      <PlayerOfMonthHistoryTable
        players={players}
        winEvents={[
          { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, playedAt: '2026-03-10T18:00:00.000Z' },
          { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, playedAt: '2026-03-20T18:00:00.000Z' },
        ]}
        timeZone="America/New_York"
        now={new Date('2026-05-15T12:00:00.000Z')}
      />,
    )

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('shows joined names for a tied month', () => {
    render(
      <PlayerOfMonthHistoryTable
        players={players}
        winEvents={[
          { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, playedAt: '2026-03-10T18:00:00.000Z' },
          { playerId: 2, name: 'Bea', tier: PlayerTier.Standard, playedAt: '2026-03-20T18:00:00.000Z' },
        ]}
        timeZone="America/New_York"
        now={new Date('2026-05-15T12:00:00.000Z')}
      />,
    )

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Bea')).toBeInTheDocument()
    expect(screen.getByText('&')).toBeInTheDocument()
  })

  it('shows empty state when no completed-month wins exist', () => {
    render(
      <PlayerOfMonthHistoryTable
        players={players}
        winEvents={[
          // Only current month events — should be excluded
          { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, playedAt: '2026-05-10T18:00:00.000Z' },
        ]}
        timeZone="America/New_York"
        now={new Date('2026-05-15T12:00:00.000Z')}
      />,
    )

    expect(screen.getByText('No completed months yet.')).toBeInTheDocument()
  })
})
