import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayerOfMonthCard } from '@/components/PlayerOfMonthCard'
import { PlayerTier } from '@/lib/player-tier'

const baseNow = new Date('2026-05-15T12:00:00.000Z')

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
    mostRecentAppearance: '2026-05-11T12:00:00.000Z',
    mostRecentWin: '2026-05-11T12:00:00.000Z',
  },
]

describe('PlayerOfMonthCard', () => {
  it('shows the current-month leader and month label', () => {
    render(
      <PlayerOfMonthCard
        players={players}
        winEvents={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-01T18:00:00.000Z',
          },
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-12T18:00:00.000Z',
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            playedAt: '2026-05-02T18:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('2 wins')).toBeInTheDocument()
    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })

  it('shows tied leaders together', () => {
    render(
      <PlayerOfMonthCard
        players={players}
        winEvents={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-01T18:00:00.000Z',
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            playedAt: '2026-05-02T18:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('Bea, Ada')).toBeInTheDocument()
    expect(screen.getByText('1 win')).toBeInTheDocument()
  })

  it('renders the empty state when no wins happened this month', () => {
    render(
      <PlayerOfMonthCard
        players={players}
        winEvents={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-04-30T18:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('No wins recorded yet this month.')).toBeInTheDocument()
  })

  it('uses the viewer local month boundary at midnight', () => {
    render(
      <PlayerOfMonthCard
        players={players}
        winEvents={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-01T03:59:00.000Z',
          },
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            playedAt: '2026-05-01T04:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={new Date('2026-05-01T04:30:00.000Z')}
      />,
    )

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('1 win')).toBeInTheDocument()
    expect(screen.getByText('May 2026')).toBeInTheDocument()
  })
})
