import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import PlayersPage from '@/app/players/page'
import { getPlayers } from '@/lib/players'
import { PlayerTier } from '@/lib/player-tier'
import { getPlayerPodiumRates, getPlayerScoreStats } from '@/lib/stats'

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
}))

vi.mock('@/lib/stats', () => ({
  getPlayerScoreStats: vi.fn(),
  getPlayerPodiumRates: vi.fn(),
}))

describe('PlayersPage', () => {
  it('renders the first player profile alongside the players list when players exist', async () => {
    vi.mocked(getPlayers).mockResolvedValue([
      {
        id: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ])
    vi.mocked(getPlayerScoreStats).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        avgScore: 9.4,
        medianScore: 9,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 4,
        avgScore: 8.7,
        medianScore: 8.5,
      },
    ])
    vi.mocked(getPlayerPodiumRates).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        podiums: 4,
        podiumRate: 0.8,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 4,
        podiums: 2,
        podiumRate: 0.5,
      },
    ])

    const element = await PlayersPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Select a player')
    expect(markup).toContain('Ada')
    expect(markup).toContain('Bea')
    expect(markup).toContain('/players/1')
    expect(markup).toContain('/players/2')
    expect(markup).toContain('PREMIUM')
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
    expect(markup).toContain('Average Score')
    expect(markup).toContain('Median Score')
    expect(markup).toContain('Podium Rate')
    expect(markup).toContain('9.4')
    expect(markup).toContain('9.0')
    expect(markup).toContain('80.0%')
    expect(markup).toContain('Across 5 games')
    expect(markup).toContain('4 podiums in 5 games')
  })

  it('renders an empty state when there are no players', async () => {
    vi.mocked(getPlayers).mockResolvedValue([])
    vi.mocked(getPlayerScoreStats).mockResolvedValue([])
    vi.mocked(getPlayerPodiumRates).mockResolvedValue([])

    const element = await PlayersPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('No players yet.')
    expect(markup).toContain('Add your first player in admin')
  })
})
