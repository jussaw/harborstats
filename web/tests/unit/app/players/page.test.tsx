import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import PlayersPage from '@/app/players/page'
import { getPlayers } from '@/lib/players'
import { PlayerTier } from '@/lib/player-tier'
import {
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerWinRateByGameSize,
} from '@/lib/stats'

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
}))

vi.mock('@/lib/stats', () => ({
  getPlayerExpectedVsActualWins: vi.fn(),
  getPlayerScoreStats: vi.fn(),
  getPlayerPodiumRates: vi.fn(),
  getPlayerFinishBreakdowns: vi.fn(),
  getPlayerMarginStats: vi.fn(),
  getPlayerWinRateByGameSize: vi.fn(),
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
    vi.mocked(getPlayerFinishBreakdowns).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        firsts: 2,
        seconds: 1,
        thirds: 1,
        lasts: 1,
        firstRate: 0.4,
        secondRate: 0.2,
        thirdRate: 0.2,
        lastRate: 0.2,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 4,
        firsts: 1,
        seconds: 2,
        thirds: 0,
        lasts: 1,
        firstRate: 0.25,
        secondRate: 0.5,
        thirdRate: 0,
        lastRate: 0.25,
      },
    ])
    vi.mocked(getPlayerMarginStats).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        winGames: 2,
        lossGames: 3,
        averageVictoryMargin: 2.5,
        averageDefeatMargin: 1.7,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        winGames: 1,
        lossGames: 3,
        averageVictoryMargin: 1,
        averageDefeatMargin: 2.3,
      },
    ])
    vi.mocked(getPlayerWinRateByGameSize).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playerCount: 2,
        games: 1,
        wins: 1,
        winRate: 1,
      },
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playerCount: 3,
        games: 2,
        wins: 1,
        winRate: 0.5,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        playerCount: 4,
        games: 4,
        wins: 1,
        winRate: 0.25,
      },
    ])
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 3,
        wins: 2,
        expectedWins: 1.2,
        winDelta: 0.8,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 4,
        wins: 1,
        expectedWins: 1.5,
        winDelta: -0.5,
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
    expect(markup).not.toContain('lucide-user')
    expect(markup).not.toContain('size-16 shrink-0')
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
    expect(markup).toContain('Average Score')
    expect(markup).toContain('Median Score')
    expect(markup).toContain('Podium Rate')
    expect(markup).toContain('Finish Breakdown')
    expect(markup).toContain('Win Rate by Opponent Count')
    expect(markup).toContain('Average Margin of Victory')
    expect(markup).toContain('Average Margin of Defeat')
    expect(markup).toContain('Expected vs Actual Wins')
    expect(markup).toContain('9.4')
    expect(markup).toContain('9.0')
    expect(markup).toContain('80.0%')
    expect(markup).toContain('40.0% (2)')
    expect(markup).toContain('20.0% (1)')
    expect(markup).toContain('2p')
    expect(markup).toContain('3p')
    expect(markup).toContain('+0.8')
    expect(markup).toContain('2 actual wins vs 1.2 expected across 3 games')
    expect(markup).toContain('2.5')
    expect(markup).toContain('1.7')
    expect(markup).toContain('Across 5 games')
    expect(markup).toContain('4 podiums in 5 games')
    expect(markup).toContain('Across 2 wins')
    expect(markup).toContain('Across 3 losses')
  })

  it('renders an empty state when there are no players', async () => {
    vi.mocked(getPlayers).mockResolvedValue([])
    vi.mocked(getPlayerScoreStats).mockResolvedValue([])
    vi.mocked(getPlayerPodiumRates).mockResolvedValue([])
    vi.mocked(getPlayerFinishBreakdowns).mockResolvedValue([])
    vi.mocked(getPlayerMarginStats).mockResolvedValue([])
    vi.mocked(getPlayerWinRateByGameSize).mockResolvedValue([])
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([])

    const element = await PlayersPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('No players yet.')
    expect(markup).toContain('Add your first player in admin')
  })
})
