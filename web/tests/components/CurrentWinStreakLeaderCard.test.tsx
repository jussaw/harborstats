import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CurrentWinStreakLeaderCard } from '@/components/CurrentWinStreakLeaderCard'
import { PlayerTier } from '@/lib/player-tier'

const baseNow = new Date('2026-04-23T12:00:00.000Z')

describe('CurrentWinStreakLeaderCard', () => {
  it('shows the eligible streak leader when their latest appearance is within the last 7 local calendar days', () => {
    render(
      <CurrentWinStreakLeaderCard
        currentWinStreaks={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            streak: 3,
            mostRecentAppearance: '2026-04-17T23:30:00.000Z',
            mostRecentWin: '2026-04-17T23:30:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('3 wins')).toBeInTheDocument()
    expect(screen.getByLabelText('Current win streak eligibility info')).toBeInTheDocument()
    expect(
      screen.getByText('To be eligible, a player must have played a game in the last 7 days.'),
    ).toBeInTheDocument()
  })

  it('filters out stale leaders and falls back to the next eligible leader', () => {
    render(
      <CurrentWinStreakLeaderCard
        currentWinStreaks={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            streak: 4,
            mostRecentAppearance: '2026-04-16T12:00:00.000Z',
            mostRecentWin: '2026-04-16T12:00:00.000Z',
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            streak: 2,
            mostRecentAppearance: '2026-04-22T12:00:00.000Z',
            mostRecentWin: '2026-04-22T12:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.queryByText('Ada')).not.toBeInTheDocument()
    expect(screen.getByText('Bea')).toBeInTheDocument()
    expect(screen.getByText('2 wins')).toBeInTheDocument()
  })

  it('renders ties among eligible leaders at the top eligible streak', () => {
    render(
      <CurrentWinStreakLeaderCard
        currentWinStreaks={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            streak: 3,
            mostRecentAppearance: '2026-04-22T12:00:00.000Z',
            mostRecentWin: '2026-04-22T12:00:00.000Z',
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            streak: 3,
            mostRecentAppearance: '2026-04-18T01:00:00.000Z',
            mostRecentWin: '2026-04-18T01:00:00.000Z',
          },
          {
            playerId: 3,
            name: 'Cara',
            tier: PlayerTier.Standard,
            streak: 2,
            mostRecentAppearance: '2026-04-22T12:00:00.000Z',
            mostRecentWin: '2026-04-22T12:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('Ada, Bea')).toBeInTheDocument()
    expect(screen.getByText('3 wins')).toBeInTheDocument()
  })

  it('renders the empty state when no eligible player has a positive streak', () => {
    render(
      <CurrentWinStreakLeaderCard
        currentWinStreaks={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            streak: 0,
            mostRecentAppearance: '2026-04-22T12:00:00.000Z',
            mostRecentWin: null,
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            streak: 2,
            mostRecentAppearance: '2026-04-10T12:00:00.000Z',
            mostRecentWin: '2026-04-10T12:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('No active win streaks yet.')).toBeInTheDocument()
  })
})
