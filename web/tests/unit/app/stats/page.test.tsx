import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import StatsPage from '@/app/stats/page'
import { PlayerTier } from '@/lib/player-tier'
import { getSettings } from '@/lib/settings'
import {
  getGameActivityTimestamps,
  getPlayerAttendanceEvents,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getTierShowdownStats,
  getPlayerWinRates,
} from '@/lib/stats'

vi.mock('@/lib/stats', () => ({
  getGameActivityTimestamps: vi.fn(),
  getPlayerAttendanceEvents: vi.fn(),
  getPlayerExpectedVsActualWins: vi.fn(),
  getPlayerWinRates: vi.fn(),
  getPlayerScoreStats: vi.fn(),
  getPlayerParticipationRates: vi.fn(),
  getPlayerPodiumRates: vi.fn(),
  getPlayerFinishBreakdowns: vi.fn(),
  getTierShowdownStats: vi.fn(),
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
    vi.mocked(getTierShowdownStats).mockResolvedValue([
      {
        tier: PlayerTier.Premium,
        players: 2,
        appearances: 9,
        wins: 4,
        winRate: 4 / 9,
      },
      {
        tier: PlayerTier.Standard,
        players: 3,
        appearances: 14,
        wins: 3,
        winRate: 3 / 14,
      },
    ])
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        wins: 3,
        expectedWins: 1.8,
        winDelta: 1.2,
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
    vi.mocked(getGameActivityTimestamps).mockResolvedValue([
      '2026-04-20T18:00:00.000Z',
      '2026-04-21T03:00:00.000Z',
      '2026-04-21T21:00:00.000Z',
    ])
    vi.mocked(getPlayerParticipationRates).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        gamesPlayed: 8,
        totalGames: 9,
        participationRate: 8 / 9,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        gamesPlayed: 6,
        totalGames: 9,
        participationRate: 2 / 3,
      },
    ])
    vi.mocked(getPlayerAttendanceEvents).mockResolvedValue([
      {
        playedAt: '2026-04-20T18:00:00.000Z',
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
      },
      {
        playedAt: '2026-04-20T18:00:00.000Z',
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
      },
    ])
    vi.mocked(getSettings).mockResolvedValue({ winRateMinGames: 3, podiumRateMinGames: 4 })

    const element = await StatsPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).not.toContain('All-Time Leaderboards')
    expect(markup).not.toContain('Stats Overview')
    expect(markup).not.toContain('href="#total-wins"')
    expect(markup).not.toContain('href="#win-rate"')
    expect(markup).toContain('Min 3 games')
    expect(markup).toContain('Min 4 games')
    expect(markup).toContain('font-semibold text-(--gold)')
    expect(markup).not.toContain('ml-2 hidden rounded-sm bg-(--gold)/15')

    const totalWinsIndex = markup.indexOf('id="total-wins"')
    const winRateIndex = markup.indexOf('id="win-rate"')
    const avgScoreIndex = markup.indexOf('id="avg-score"')
    const medianScoreIndex = markup.indexOf('id="median-score"')
    const podiumRateIndex = markup.indexOf('id="podium-rate"')
    const expectedVsActualWinsIndex = markup.indexOf('id="expected-vs-actual-wins"')
    const tierShowdownIndex = markup.indexOf('id="tier-showdown"')
    const finishBreakdownIndex = markup.indexOf('id="finish-breakdown"')
    const gamesOverTimeIndex = markup.indexOf('id="games-over-time"')
    const participationRateIndex = markup.indexOf('id="participation-rate"')
    const attendanceIndex = markup.indexOf('id="player-attendance-over-time"')
    const calendarHeatmapIndex = markup.indexOf('id="calendar-heatmap"')
    const dayOfWeekPatternIndex = markup.indexOf('id="day-of-week-pattern"')
    const timeOfDayPatternIndex = markup.indexOf('id="time-of-day-pattern"')
    const averageGamesPerSessionIndex = markup.indexOf('id="average-games-per-session"')

    expect(totalWinsIndex).toBeGreaterThan(-1)
    expect(winRateIndex).toBeGreaterThan(totalWinsIndex)
    expect(avgScoreIndex).toBeGreaterThan(winRateIndex)
    expect(medianScoreIndex).toBeGreaterThan(avgScoreIndex)
    expect(podiumRateIndex).toBeGreaterThan(medianScoreIndex)
    expect(expectedVsActualWinsIndex).toBeGreaterThan(podiumRateIndex)
    expect(tierShowdownIndex).toBeGreaterThan(expectedVsActualWinsIndex)
    expect(finishBreakdownIndex).toBeGreaterThan(tierShowdownIndex)
    expect(gamesOverTimeIndex).toBeGreaterThan(finishBreakdownIndex)
    expect(participationRateIndex).toBeGreaterThan(gamesOverTimeIndex)
    expect(attendanceIndex).toBeGreaterThan(participationRateIndex)
    expect(calendarHeatmapIndex).toBeGreaterThan(attendanceIndex)
    expect(dayOfWeekPatternIndex).toBeGreaterThan(calendarHeatmapIndex)
    expect(timeOfDayPatternIndex).toBeGreaterThan(dayOfWeekPatternIndex)
    expect(averageGamesPerSessionIndex).toBeGreaterThan(timeOfDayPatternIndex)

    expect(markup).toContain('Finish Breakdown')
    expect(markup).toContain('>1st<')
    expect(markup).toContain('>2nd<')
    expect(markup).toContain('>3rd<')
    expect(markup).toContain('>Last<')
    expect(markup).toContain('Tier Showdown')
    expect(markup).toContain('>Tier<')
    expect(markup).toContain('>Appearances<')
    expect(markup).toContain('>Players<')
    expect(markup).toContain('Expected vs Actual Wins')
    expect(markup).not.toContain('Days Since Last Game')
    expect(markup).toContain('Games Over Time')
    expect(markup).toContain('Participation Rate')
    expect(markup).toContain('Player Attendance Over Time')
    expect(markup).toContain('Calendar Heatmap')
    expect(markup).toContain('Day-of-Week Pattern')
    expect(markup).toContain('Time-of-Day Pattern')
    expect(markup).toContain('Average Games per Session')
    expect(markup).toContain('Loading your local-time view...')
    expect(markup).toContain('88.9%')
    expect(markup).toContain('66.7%')
    expect(markup).toContain('+1.2')
    expect(markup).toContain('-0.5')

    expect(markup.slice(totalWinsIndex, totalWinsIndex + 160)).not.toContain('lg:col-span-2')
    expect(markup.slice(winRateIndex, winRateIndex + 160)).not.toContain('lg:col-span-2')
    expect(markup.slice(expectedVsActualWinsIndex, expectedVsActualWinsIndex + 160)).not.toContain(
      'lg:col-span-2',
    )
    expect(markup.slice(gamesOverTimeIndex, gamesOverTimeIndex + 160)).toContain('lg:col-span-2')
    expect(markup.slice(participationRateIndex, participationRateIndex + 160)).toContain(
      'lg:col-span-2',
    )
    expect(markup.slice(attendanceIndex, attendanceIndex + 160)).toContain('lg:col-span-2')
    expect(markup.slice(calendarHeatmapIndex, calendarHeatmapIndex + 160)).toContain(
      'lg:col-span-2',
    )
    expect(markup.slice(dayOfWeekPatternIndex, dayOfWeekPatternIndex + 160)).not.toContain(
      'lg:col-span-2',
    )
    expect(markup.slice(timeOfDayPatternIndex, timeOfDayPatternIndex + 160)).not.toContain(
      'lg:col-span-2',
    )
    expect(markup.slice(averageGamesPerSessionIndex, averageGamesPerSessionIndex + 160)).not.toContain(
      'lg:col-span-2',
    )
  })

  it('renders card empty states when no stats are available', async () => {
    vi.mocked(getPlayerWinRates).mockResolvedValue([])
    vi.mocked(getPlayerScoreStats).mockResolvedValue([])
    vi.mocked(getPlayerPodiumRates).mockResolvedValue([])
    vi.mocked(getPlayerFinishBreakdowns).mockResolvedValue([])
    vi.mocked(getTierShowdownStats).mockResolvedValue([])
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([])
    vi.mocked(getGameActivityTimestamps).mockResolvedValue([])
    vi.mocked(getPlayerParticipationRates).mockResolvedValue([])
    vi.mocked(getPlayerAttendanceEvents).mockResolvedValue([])
    vi.mocked(getSettings).mockResolvedValue({ winRateMinGames: 2, podiumRateMinGames: 5 })

    const element = await StatsPage()
    const markup = renderToStaticMarkup(element)

    expect(markup).not.toContain('All-Time Leaderboards')
    expect(markup).not.toContain('href="#total-wins"')
    expect(markup).toContain('No wins recorded yet.')
    expect(markup).toContain('No players have played 2+ games yet.')
    expect(markup).toContain('No players have played 5+ games yet.')
    expect(markup).not.toContain('Days Since Last Game')
    expect(markup).toContain('Games Over Time')
    expect(markup).toContain('Participation Rate')
    expect(markup).toContain('Player Attendance Over Time')
    expect(markup).toContain('Calendar Heatmap')
    expect(markup).toContain('Day-of-Week Pattern')
    expect(markup).toContain('Time-of-Day Pattern')
    expect(markup).toContain('Average Games per Session')
    expect(markup.match(/No games recorded yet\./g)).toHaveLength(12)
  })

  it('filters the podium leaderboard using the podium threshold instead of the win-rate threshold', async () => {
    vi.mocked(getPlayerWinRates).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        wins: 2,
        winRate: 0.4,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 3,
        wins: 1,
        winRate: 1 / 3,
      },
    ])
    vi.mocked(getPlayerScoreStats).mockResolvedValue([])
    vi.mocked(getPlayerPodiumRates).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        podiums: 3,
        podiumRate: 0.6,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 3,
        podiums: 3,
        podiumRate: 1,
      },
    ])
    vi.mocked(getPlayerFinishBreakdowns).mockResolvedValue([])
    vi.mocked(getTierShowdownStats).mockResolvedValue([])
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([])
    vi.mocked(getGameActivityTimestamps).mockResolvedValue([])
    vi.mocked(getPlayerParticipationRates).mockResolvedValue([])
    vi.mocked(getPlayerAttendanceEvents).mockResolvedValue([])
    vi.mocked(getSettings).mockResolvedValue({ winRateMinGames: 2, podiumRateMinGames: 4 })

    const element = await StatsPage()
    const markup = renderToStaticMarkup(element)
    const podiumRateIndex = markup.indexOf('id="podium-rate"')
    const expectedVsActualWinsIndex = markup.indexOf('id="expected-vs-actual-wins"')
    const podiumSection = markup.slice(podiumRateIndex, expectedVsActualWinsIndex)

    expect(podiumSection).toContain('Min 4 games')
    expect(podiumSection).toContain('Ada')
    expect(podiumSection).not.toContain('Bea')
    expect(markup).toContain('section id="win-rate"')
    expect(markup).toContain('Bea')
  })
})
