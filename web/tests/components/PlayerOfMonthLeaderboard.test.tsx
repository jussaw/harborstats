import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerOfMonthLeaderboard } from '@/components/PlayerOfMonthLeaderboard'
import { PlayerTier } from '@/lib/player-tier'

const players = [
  {
    playerId: 1,
    name: 'Ada',
    tier: PlayerTier.Premium,
    streak: 0,
    mostRecentAppearance: '2026-05-12T12:00:00.000Z',
    mostRecentWin: '2026-05-12T12:00:00.000Z',
  },
  {
    playerId: 2,
    name: 'Bea',
    tier: PlayerTier.Standard,
    streak: 0,
    mostRecentAppearance: '2026-05-13T12:00:00.000Z',
    mostRecentWin: '2026-05-13T12:00:00.000Z',
  },
  {
    playerId: 3,
    name: 'Cara',
    tier: PlayerTier.Standard,
    streak: 0,
    mostRecentAppearance: null,
    mostRecentWin: null,
  },
]

describe('PlayerOfMonthLeaderboard', () => {
  it('renders leaderboard ranks with a crown for first place', () => {
    render(
      <PlayerOfMonthLeaderboard
        players={players}
        winEvents={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-04T18:00:00.000Z',
          },
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-10T18:00:00.000Z',
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            playedAt: '2026-05-02T18:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={new Date('2026-05-15T12:00:00.000Z')}
      />,
    )

    expect(screen.getByText('May 2026')).toBeInTheDocument()
    const rows = screen.getAllByRole('row')

    expect(within(rows[1]).getByText('👑')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Ada')).toBeInTheDocument()
    expect(within(rows[2]).getByText('2')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Bea')).toBeInTheDocument()
  })

  it('gives tied leaders the same rank', () => {
    render(
      <PlayerOfMonthLeaderboard
        players={players}
        winEvents={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-04T18:00:00.000Z',
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            playedAt: '2026-05-05T18:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={new Date('2026-05-15T12:00:00.000Z')}
      />,
    )

    const crowns = screen.getAllByText('👑')
    expect(crowns).toHaveLength(2)
  })

  it('keeps zero-win players at the bottom of the table', () => {
    render(
      <PlayerOfMonthLeaderboard
        players={players}
        winEvents={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-04T18:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={new Date('2026-05-15T12:00:00.000Z')}
      />,
    )

    const rows = screen.getAllByRole('row')
    expect(within(rows[3]).getByText('Cara')).toBeInTheDocument()
    expect(within(rows[3]).getByText('0')).toBeInTheDocument()
  })

  it('renders an empty state when the month has no wins', () => {
    render(
      <PlayerOfMonthLeaderboard
        players={players}
        winEvents={[]}
        timeZone="America/New_York"
        now={new Date('2026-05-15T12:00:00.000Z')}
      />,
    )

    expect(screen.getByText('No wins recorded yet this month.')).toBeInTheDocument()
  })
})
