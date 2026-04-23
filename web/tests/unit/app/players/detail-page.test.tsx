import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PlayerProfilePage, { generateMetadata } from '@/app/players/[id]/page'
import { listGamesForPlayer } from '@/lib/games'
import { getPlayerById, getPlayers } from '@/lib/players'
import { PlayerTier } from '@/lib/player-tier'
import {
  getPlayerCurrentWinStreaks,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerStreakRecords,
  getPlayerWinEvents,
  getPlayerWinRateByGameSize,
} from '@/lib/stats'

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

vi.mock('@/lib/games', () => ({
  listGamesForPlayer: vi.fn(),
}))

vi.mock('@/lib/stats', () => ({
  getPlayerCurrentWinStreaks: vi.fn(),
  getPlayerExpectedVsActualWins: vi.fn(),
  getPlayerScoreStats: vi.fn(),
  getPlayerStreakRecords: vi.fn(),
  getPlayerPodiumRates: vi.fn(),
  getPlayerFinishBreakdowns: vi.fn(),
  getPlayerMarginStats: vi.fn(),
  getPlayerParticipationRates: vi.fn(),
  getPlayerWinEvents: vi.fn(),
  getPlayerWinRateByGameSize: vi.fn(),
}))

describe('PlayerProfilePage', () => {
  beforeEach(() => {
    vi.mocked(listGamesForPlayer).mockResolvedValue([])
  })

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
        seconds: 1,
        thirds: 1,
        lasts: 2,
        firstRate: 0.25,
        secondRate: 0.25,
        thirdRate: 0.25,
        lastRate: 0.5,
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
        winGames: 0,
        lossGames: 4,
        averageVictoryMargin: null,
        averageDefeatMargin: 1.5,
      },
    ])
    vi.mocked(getPlayerWinRateByGameSize).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playerCount: 2,
        games: 2,
        wins: 2,
        winRate: 1,
      },
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playerCount: 3,
        games: 3,
        wins: 1,
        winRate: 1 / 3,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        playerCount: 2,
        games: 1,
        wins: 1,
        winRate: 1,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        playerCount: 4,
        games: 3,
        wins: 1,
        winRate: 1 / 3,
      },
    ])
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        wins: 2,
        expectedWins: 1.3,
        winDelta: 0.7,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 4,
        wins: 1,
        expectedWins: 1.6,
        winDelta: -0.6,
      },
    ])
    vi.mocked(getPlayerParticipationRates).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        gamesPlayed: 5,
        totalGames: 7,
        participationRate: 5 / 7,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        gamesPlayed: 4,
        totalGames: 7,
        participationRate: 4 / 7,
      },
    ])
    vi.mocked(getPlayerCurrentWinStreaks).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        streak: 2,
        mostRecentWin: '2026-04-20T18:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        streak: 0,
        mostRecentWin: '2026-04-18T18:00:00.000Z',
      },
    ])
    vi.mocked(getPlayerWinEvents).mockResolvedValue([
      {
        playedAt: '2026-03-01T01:00:00.000Z',
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
      },
      {
        playedAt: '2026-03-17T04:00:00.000Z',
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
      },
    ])
    vi.mocked(getPlayerStreakRecords).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        longestWinStreak: 3,
        longestWinStreakStartedAt: '2026-04-18T18:00:00.000Z',
        longestWinStreakEndedAt: '2026-04-20T18:00:00.000Z',
        currentLossStreak: 0,
        currentLossStreakStartedAt: null,
        currentLossStreakEndedAt: null,
        longestLossStreak: 1,
        longestLossStreakStartedAt: '2026-04-21T18:00:00.000Z',
        longestLossStreakEndedAt: '2026-04-21T18:00:00.000Z',
        attendanceStreak: 5,
        attendanceStreakStartedAt: '2026-04-17T18:00:00.000Z',
        attendanceStreakEndedAt: '2026-04-21T18:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        longestWinStreak: 2,
        longestWinStreakStartedAt: '2026-03-01T01:00:00.000Z',
        longestWinStreakEndedAt: '2026-03-17T04:00:00.000Z',
        currentLossStreak: 3,
        currentLossStreakStartedAt: '2026-04-18T18:00:00.000Z',
        currentLossStreakEndedAt: '2026-04-21T18:00:00.000Z',
        longestLossStreak: 4,
        longestLossStreakStartedAt: '2026-02-01T18:00:00.000Z',
        longestLossStreakEndedAt: '2026-02-08T18:00:00.000Z',
        attendanceStreak: 6,
        attendanceStreakStartedAt: '2026-03-01T01:00:00.000Z',
        attendanceStreakEndedAt: '2026-04-21T18:00:00.000Z',
      },
    ])
    vi.mocked(listGamesForPlayer).mockResolvedValue([
      {
        id: 12,
        playedAt: new Date('2026-04-21T18:00:00.000Z'),
        notes: 'Bea spotlight',
        players: [
          { playerName: 'Ada', score: 7, isWinner: false },
          { playerName: 'Bea', score: 11, isWinner: true },
        ],
      },
      {
        id: 8,
        playedAt: new Date('2026-04-18T18:00:00.000Z'),
        notes: '',
        players: [
          { playerName: 'Bea', score: 9, isWinner: true },
          { playerName: 'Cara', score: 6, isWinner: false },
        ],
      },
    ])

    const element = await PlayerProfilePage({ params: Promise.resolve({ id: '2' }) })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Ada')
    expect(markup).toContain('Bea')
    expect(markup).toContain('href="/players"')
    expect(markup).toContain('View Games (2)')
    expect(markup).not.toContain('PREMIUM')
    expect(markup).not.toContain('lucide-user')
    expect(markup).not.toContain('size-16 shrink-0')
    expect(markup).toContain('Average Score')
    expect(markup).toContain('Median Score')
    expect(markup).toContain('Podium Rate')
    expect(markup).toContain('Participation Rate')
    expect(markup).toContain('Finish Breakdown')
    expect(markup).toContain('Win Rate by Opponent Count')
    expect(markup).toContain('Average Margin of Victory')
    expect(markup).toContain('Average Margin of Defeat')
    expect(markup).toContain('Expected vs Actual Wins')
    expect(markup).toContain('Current Win Streak')
    expect(markup).toContain('Most Wins in a Week')
    expect(markup).toContain('Most Wins in a Month')
    expect(markup).toContain('Longest Win Streak Ever')
    expect(markup).toContain('Current / Longest Loss Streak')
    expect(markup).toContain('Attendance Streak')
    const longestWinStreakSectionIndex = markup.indexOf('id="player-longest-win-streak-ever"')
    const longestWinStreakSection = markup.slice(
      longestWinStreakSectionIndex,
      longestWinStreakSectionIndex + 2200,
    )
    expect(longestWinStreakSection).toContain('Mar 1, 2026')
    expect(longestWinStreakSection).toContain('Mar 17, 2026')
    expect(longestWinStreakSection).not.toContain('1:00 AM')
    expect(longestWinStreakSection).not.toContain('12:00 AM')
    expect(markup).toContain('8.7')
    expect(markup).toContain('8.5')
    expect(markup).toContain('50.0%')
    expect(markup).toContain('57.1%')
    expect(markup).toContain('25.0% (1)')
    expect(markup).toContain('50.0% (2)')
    expect(markup).toContain('2p')
    expect(markup).toContain('4p')
    expect(markup).toContain('33.3%')
    expect(markup).toContain('-0.6')
    expect(markup).toContain('1 actual win vs 1.6 expected across 4 games')
    expect(markup).toContain('Across 4 games')
    expect(markup).toContain('2 podiums in 4 games')
    expect(markup).toContain('4 appearances in 7 total games')
    expect(markup).toContain('0 wins')
    expect(markup).toContain('2 wins')
    expect(markup).toContain('Current: 3 losses')
    expect(markup).toContain('Longest: 4 losses')
    expect(markup).toContain('6 games')
    expect(markup).toContain('1.5')
    expect(markup).toContain('Across 4 losses')
    expect(markup).toContain('Loading your local-time view...')
    expect(markup.match(/No games recorded yet\./g)).toHaveLength(2)
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
        games: 0,
        firsts: 0,
        seconds: 0,
        thirds: 0,
        lasts: 0,
        firstRate: 0,
        secondRate: 0,
        thirdRate: 0,
        lastRate: 0,
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
        winGames: 0,
        lossGames: 0,
        averageVictoryMargin: null,
        averageDefeatMargin: null,
      },
    ])
    vi.mocked(getPlayerWinRateByGameSize).mockResolvedValue([])
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        wins: 2,
        expectedWins: 1.3,
        winDelta: 0.7,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 0,
        wins: 0,
        expectedWins: 0,
        winDelta: 0,
      },
    ])
    vi.mocked(getPlayerParticipationRates).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        gamesPlayed: 5,
        totalGames: 5,
        participationRate: 1,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        gamesPlayed: 0,
        totalGames: 5,
        participationRate: 0,
      },
    ])
    vi.mocked(getPlayerCurrentWinStreaks).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        streak: 2,
        mostRecentWin: '2026-04-20T18:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        streak: 0,
        mostRecentWin: null,
      },
    ])
    vi.mocked(getPlayerWinEvents).mockResolvedValue([])
    vi.mocked(getPlayerStreakRecords).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        longestWinStreak: 2,
        longestWinStreakStartedAt: '2026-04-18T18:00:00.000Z',
        longestWinStreakEndedAt: '2026-04-20T18:00:00.000Z',
        currentLossStreak: 0,
        currentLossStreakStartedAt: null,
        currentLossStreakEndedAt: null,
        longestLossStreak: 1,
        longestLossStreakStartedAt: '2026-04-21T18:00:00.000Z',
        longestLossStreakEndedAt: '2026-04-21T18:00:00.000Z',
        attendanceStreak: 5,
        attendanceStreakStartedAt: '2026-04-17T18:00:00.000Z',
        attendanceStreakEndedAt: '2026-04-21T18:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        longestWinStreak: 0,
        longestWinStreakStartedAt: null,
        longestWinStreakEndedAt: null,
        currentLossStreak: 0,
        currentLossStreakStartedAt: null,
        currentLossStreakEndedAt: null,
        longestLossStreak: 0,
        longestLossStreakStartedAt: null,
        longestLossStreakEndedAt: null,
        attendanceStreak: 0,
        attendanceStreakStartedAt: null,
        attendanceStreakEndedAt: null,
      },
    ])
    vi.mocked(listGamesForPlayer).mockResolvedValue([])

    const element = await PlayerProfilePage({ params: Promise.resolve({ id: '2' }) })
    const markup = renderToStaticMarkup(element)

    expect(markup).toContain('Average Score')
    expect(markup).toContain('Median Score')
    expect(markup).toContain('Podium Rate')
    expect(markup).toContain('Participation Rate')
    expect(markup).toContain('Finish Breakdown')
    expect(markup).toContain('Win Rate by Opponent Count')
    expect(markup).toContain('Average Margin of Victory')
    expect(markup).toContain('Average Margin of Defeat')
    expect(markup).toContain('Expected vs Actual Wins')
    expect(markup).toContain('Current Win Streak')
    expect(markup).toContain('Most Wins in a Week')
    expect(markup).toContain('Most Wins in a Month')
    expect(markup).toContain('Longest Win Streak Ever')
    expect(markup).toContain('Current / Longest Loss Streak')
    expect(markup).toContain('Attendance Streak')
    expect(markup).toContain('View Games (0)')
    expect(markup).toContain('0.0%')
    expect(markup).toContain('0 appearances in 5 total games')
    expect(markup).toContain('0 wins')
    expect(markup).toContain('Current: 0 losses')
    expect(markup).toContain('Longest: 0 losses')
    expect(markup).toContain('0 games')
    expect(markup.match(/No games recorded yet\./g)).toHaveLength(22)
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
