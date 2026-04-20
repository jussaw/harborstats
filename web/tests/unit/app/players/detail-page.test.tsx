import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import PlayerProfilePage, { generateMetadata } from '@/app/players/[id]/page'
import { getPlayerById, getPlayers } from '@/lib/players'
import { PlayerTier } from '@/lib/player-tier'

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

    const element = await PlayerProfilePage({ params: Promise.resolve({ id: '2' }) })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Ada')
    expect(markup).toContain('Bea')
    expect(markup).toContain('href="/players"')
    expect(markup).not.toContain('PREMIUM')
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
