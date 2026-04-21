import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import StatsPage from '@/app/stats/page'
import { PlayerTier } from '@/lib/player-tier'
import { getSettings } from '@/lib/settings'
import {
  getPlayerFinishBreakdowns,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerWinRates,
} from '@/lib/stats'

vi.mock('@/lib/stats', () => ({
  getPlayerWinRates: vi.fn(),
  getPlayerScoreStats: vi.fn(),
  getPlayerPodiumRates: vi.fn(),
  getPlayerFinishBreakdowns: vi.fn(),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(),
}))

describe('StatsPage', () => {
  it('renders stat sections in order without the page header or anchor nav', async () => {
    vi.mocked(getPlayerWinRates).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        wins: 3,
        winRate: 0.6,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 4,
        wins: 2,
        winRate: 0.5,
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
        firsts: 3,
        seconds: 1,
        thirds: 0,
        lasts: 0,
        firstRate: 0.6,
        secondRate: 0.2,
        thirdRate: 0,
        lastRate: 0,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 4,
        firsts: 1,
        seconds: 2,
        thirds: 1,
        lasts: 1,
        firstRate: 0.25,
        secondRate: 0.5,
        thirdRate: 0.25,
        lastRate: 0.25,
      },
    ])
    vi.mocked(getSettings).mockResolvedValue({ winRateMinGames: 3 })

    const element = await StatsPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).not.toContain('All-Time Leaderboards')
    expect(markup).not.toContain('Stats Overview')
    expect(markup).not.toContain('href="#total-wins"')
    expect(markup).not.toContain('href="#win-rate"')
    expect(markup).toContain('Min 3 games')
    expect(markup).toContain('font-semibold text-(--gold)')
    expect(markup).toContain('ml-2 hidden rounded-sm bg-(--gold)/15')
    expect(markup).toContain('text-(--gold) uppercase')
    expect(markup).toContain('>Premium</span>')

    const totalWinsIndex = markup.indexOf('id="total-wins"')
    const winRateIndex = markup.indexOf('id="win-rate"')
    const avgScoreIndex = markup.indexOf('id="avg-score"')
    const medianScoreIndex = markup.indexOf('id="median-score"')
    const podiumRateIndex = markup.indexOf('id="podium-rate"')
    const finishBreakdownIndex = markup.indexOf('id="finish-breakdown"')

    expect(totalWinsIndex).toBeGreaterThan(-1)
    expect(winRateIndex).toBeGreaterThan(totalWinsIndex)
    expect(avgScoreIndex).toBeGreaterThan(winRateIndex)
    expect(medianScoreIndex).toBeGreaterThan(avgScoreIndex)
    expect(podiumRateIndex).toBeGreaterThan(medianScoreIndex)
    expect(finishBreakdownIndex).toBeGreaterThan(podiumRateIndex)
    expect(markup).toContain('Finish Breakdown')
    expect(markup).toContain('>1st<')
    expect(markup).toContain('>2nd<')
    expect(markup).toContain('>3rd<')
    expect(markup).toContain('>Last<')
  })

  it('renders card empty states when no stats are available', async () => {
    vi.mocked(getPlayerWinRates).mockResolvedValue([])
    vi.mocked(getPlayerScoreStats).mockResolvedValue([])
    vi.mocked(getPlayerPodiumRates).mockResolvedValue([])
    vi.mocked(getPlayerFinishBreakdowns).mockResolvedValue([])
    vi.mocked(getSettings).mockResolvedValue({ winRateMinGames: 2 })

    const element = await StatsPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).not.toContain('All-Time Leaderboards')
    expect(markup).not.toContain('href="#total-wins"')
    expect(markup).toContain('No wins recorded yet.')
    expect(markup).toContain('No players have played 2+ games yet.')
    expect(markup.match(/No games recorded yet\./g)).toHaveLength(4)
  })
})
