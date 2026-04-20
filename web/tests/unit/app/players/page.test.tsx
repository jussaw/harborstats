import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import PlayersPage from '@/app/players/page'
import { getPlayers } from '@/lib/players'
import { PlayerTier } from '@/lib/player-tier'

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
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

    const element = await PlayersPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Select a player')
    expect(markup).toContain('Ada')
    expect(markup).toContain('Bea')
    expect(markup).toContain('/players/1')
    expect(markup).toContain('/players/2')
    expect(markup).toContain('PREMIUM')
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
  })

  it('renders an empty state when there are no players', async () => {
    vi.mocked(getPlayers).mockResolvedValue([])

    const element = await PlayersPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('No players yet.')
    expect(markup).toContain('Add your first player in admin')
  })
})
