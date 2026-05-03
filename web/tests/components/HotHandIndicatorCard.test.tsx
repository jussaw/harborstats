import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HotHandIndicatorCard } from '@/components/HotHandIndicatorCard'
import { PlayerTier } from '@/lib/player-tier'

const baseNow = new Date('2026-05-15T12:00:00.000Z')

describe('HotHandIndicatorCard', () => {
  it('shows a flagged player with 3 of their last 5 wins', () => {
    render(
      <HotHandIndicatorCard
        hotHand={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            gamesInLast5: 5,
            winsInLast5: 3,
            mostRecentAppearance: '2026-05-14T12:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('3 of last 5')).toBeInTheDocument()
    expect(screen.getByLabelText('Hot hand eligibility info')).toBeInTheDocument()
  })

  it('shows ties among multiple flagged players at the top eligible mark', () => {
    render(
      <HotHandIndicatorCard
        hotHand={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            gamesInLast5: 5,
            winsInLast5: 4,
            mostRecentAppearance: '2026-05-14T12:00:00.000Z',
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            gamesInLast5: 5,
            winsInLast5: 4,
            mostRecentAppearance: '2026-05-13T12:00:00.000Z',
          },
          {
            playerId: 3,
            name: 'Cara',
            tier: PlayerTier.Standard,
            gamesInLast5: 5,
            winsInLast5: 3,
            mostRecentAppearance: '2026-05-14T12:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('Ada, Bea')).toBeInTheDocument()
    expect(screen.getByText('4 of last 5')).toBeInTheDocument()
  })

  it('does not flag players below 3 wins', () => {
    render(
      <HotHandIndicatorCard
        hotHand={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            gamesInLast5: 5,
            winsInLast5: 2,
            mostRecentAppearance: '2026-05-14T12:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('No players are running hot right now.')).toBeInTheDocument()
  })

  it('does not flag players with fewer than 5 lifetime games', () => {
    render(
      <HotHandIndicatorCard
        hotHand={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            gamesInLast5: 4,
            winsInLast5: 3,
            mostRecentAppearance: '2026-05-14T12:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('No players are running hot right now.')).toBeInTheDocument()
  })

  it('does not flag stale players outside the 7-day local window', () => {
    render(
      <HotHandIndicatorCard
        hotHand={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            gamesInLast5: 5,
            winsInLast5: 4,
            mostRecentAppearance: '2026-05-07T12:00:00.000Z',
          },
        ]}
        timeZone="America/New_York"
        now={baseNow}
      />,
    )

    expect(screen.getByText('No players are running hot right now.')).toBeInTheDocument()
  })

  it('renders the empty state when no indicators are available', () => {
    render(
      <HotHandIndicatorCard hotHand={[]} timeZone="America/New_York" now={baseNow} />,
    )

    expect(screen.getByText('No players are running hot right now.')).toBeInTheDocument()
  })
})
