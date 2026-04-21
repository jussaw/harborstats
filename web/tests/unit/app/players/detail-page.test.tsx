import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import PlayerProfilePage, { generateMetadata } from '@/app/players/[id]/page'
import { getPlayerById, getPlayers } from '@/lib/players'
import { PlayerTier } from '@/lib/player-tier'
import { getPlayerPodiumRates, getPlayerScoreStats } from '@/lib/stats'

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}))

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
  getPlayerById: vi.fn(),
}))

vi.mock('@/lib/stats', () => ({
  getPlayerScoreStats: vi.fn(),
  getPlayerPodiumRates: vi.fn(),
}))

describe('PlayerProfilePage', () => {
  it('renders the selected player profile with a back link to the players list', async () => {
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

    const element = await PlayerProfilePage({ params: Promise.resolve({ id: '2' }) })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Ada')
    expect(markup).toContain('Bea')
    expect(markup).toContain('href="/players"')
    expect(markup).not.toContain('PREMIUM')
    expect(markup).toContain('Average Score')
    expect(markup).toContain('Median Score')
    expect(markup).toContain('Podium Rate')
    expect(markup).toContain('8.7')
    expect(markup).toContain('8.5')
    expect(markup).toContain('50.0%')
    expect(markup).toContain('Across 4 games')
    expect(markup).toContain('2 podiums in 4 games')
  })

  it('renders empty profile stat cards when the selected player has no recorded games', async () => {
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
        games: 0,
        podiums: 0,
        podiumRate: 0,
      },
    ])

    const element = await PlayerProfilePage({ params: Promise.resolve({ id: '2' }) })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Average Score')
    expect(markup).toContain('Median Score')
    expect(markup).toContain('Podium Rate')
    expect(markup.match(/No games recorded yet\./g)).toHaveLength(6)
    expect(markup).not.toContain('0.0%')
  })

  it('calls notFound for invalid player ids', async () => {
    await expect(PlayerProfilePage({ params: Promise.resolve({ id: 'abc' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
  })

  it('calls notFound when the player does not exist', async () => {
    vi.mocked(getPlayers).mockResolvedValue([
      {
        id: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ])

    await expect(PlayerProfilePage({ params: Promise.resolve({ id: '999' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    )
  })

  it('uses the selected player for metadata titles', async () => {
    vi.mocked(getPlayerById).mockResolvedValue({
      id: 1,
      name: 'Ada',
      tier: PlayerTier.Premium,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    })

    await expect(generateMetadata({ params: Promise.resolve({ id: '1' }) })).resolves.toEqual({
      title: 'Ada — HarborStats',
    })
  })
})
