import { describe, expect, it, vi } from 'vitest'
import {
  buildPlayerBestMonthWinRecords,
  buildPlayerBestWeekWinRecords,
  buildPlayerCurrentMonthWinRecords,
  buildBusiestActivityRecords,
  buildCalendarHeatmapData,
  buildCumulativeGamesSeries,
  buildDayOfWeekPattern,
  buildGamesOverTimeSeries,
  buildLongestGameGap,
  buildSessionSummary,
  buildTimeOfDayPattern,
  getDaysSinceLastGame,
  isWithinRecentLocalCalendarDays,
} from '@/lib/activity-local-time'
import { PlayerTier } from '@/lib/player-tier'

describe('activity-local-time', () => {
  it('groups weekday, hour, and session stats in the supplied local timezone', () => {
    const playedAtIsos = [
      '2026-04-21T01:30:00.000Z',
      '2026-04-21T03:15:00.000Z',
      '2026-04-21T14:00:00.000Z',
    ]

    const weekdayPattern = buildDayOfWeekPattern({
      playedAtIsos,
      timeZone: 'America/New_York',
    })
    const timeOfDayPattern = buildTimeOfDayPattern({
      playedAtIsos,
      timeZone: 'America/New_York',
    })
    const sessionSummary = buildSessionSummary({
      playedAtIsos,
      timeZone: 'America/New_York',
    })

    expect(weekdayPattern.map((bucket) => bucket.gameCount)).toEqual([0, 2, 1, 0, 0, 0, 0])
    expect(weekdayPattern[1]).toMatchObject({ label: 'Mon', gameCount: 2 })
    expect(weekdayPattern[2]).toMatchObject({ label: 'Tue', gameCount: 1 })

    expect(timeOfDayPattern.find((bucket) => bucket.label === '9 PM')).toMatchObject({
      gameCount: 1,
    })
    expect(timeOfDayPattern.find((bucket) => bucket.label === '11 PM')).toMatchObject({
      gameCount: 1,
    })
    expect(timeOfDayPattern.find((bucket) => bucket.label === '10 AM')).toMatchObject({
      gameCount: 1,
    })

    expect(sessionSummary).toEqual({
      totalGames: 3,
      sessionCount: 2,
      averageGamesPerSession: 1.5,
    })
  })

  it('builds local weekly and monthly buckets with zero-filled gaps across utc boundaries', () => {
    const series = buildGamesOverTimeSeries({
      playedAtIsos: [
        '2026-03-01T01:00:00.000Z',
        '2026-03-02T04:00:00.000Z',
        '2026-03-03T05:00:00.000Z',
        '2026-03-17T04:00:00.000Z',
      ],
      timeZone: 'America/New_York',
    })

    expect(series.totalGames).toBe(4)
    expect(series.weekly.map((bucket) => ({
      bucketStart: bucket.bucketStart,
      gameCount: bucket.gameCount,
    }))).toEqual([
      { bucketStart: '2026-02-23', gameCount: 2 },
      { bucketStart: '2026-03-02', gameCount: 1 },
      { bucketStart: '2026-03-09', gameCount: 0 },
      { bucketStart: '2026-03-16', gameCount: 1 },
    ])
    expect(series.monthly.map((bucket) => ({
      bucketStart: bucket.bucketStart,
      gameCount: bucket.gameCount,
    }))).toEqual([
      { bucketStart: '2026-02-01', gameCount: 1 },
      { bucketStart: '2026-03-01', gameCount: 3 },
    ])
  })

  it('builds cumulative weekly and monthly buckets with zero-filled gaps and running totals', () => {
    const series = buildCumulativeGamesSeries({
      playedAtIsos: [
        '2026-03-01T01:00:00.000Z',
        '2026-03-02T04:00:00.000Z',
        '2026-03-03T05:00:00.000Z',
        '2026-03-17T04:00:00.000Z',
      ],
      timeZone: 'America/New_York',
    })

    expect(series.totalGames).toBe(4)
    expect(series.weekly.map((bucket) => ({
      bucketStart: bucket.bucketStart,
      gameCount: bucket.gameCount,
      cumulativeGames: bucket.cumulativeGames,
    }))).toEqual([
      { bucketStart: '2026-02-23', gameCount: 2, cumulativeGames: 2 },
      { bucketStart: '2026-03-02', gameCount: 1, cumulativeGames: 3 },
      { bucketStart: '2026-03-09', gameCount: 0, cumulativeGames: 3 },
      { bucketStart: '2026-03-16', gameCount: 1, cumulativeGames: 4 },
    ])
    expect(series.monthly.map((bucket) => ({
      bucketStart: bucket.bucketStart,
      gameCount: bucket.gameCount,
      cumulativeGames: bucket.cumulativeGames,
    }))).toEqual([
      { bucketStart: '2026-02-01', gameCount: 1, cumulativeGames: 1 },
      { bucketStart: '2026-03-01', gameCount: 3, cumulativeGames: 4 },
    ])
  })

  it('builds busiest day, iso-week, and month records in local time across utc boundaries', () => {
    const records = buildBusiestActivityRecords({
      playedAtIsos: [
        '2026-03-01T01:00:00.000Z',
        '2026-03-01T03:00:00.000Z',
        '2026-03-01T20:00:00.000Z',
        '2026-03-03T05:00:00.000Z',
        '2026-03-17T04:00:00.000Z',
      ],
      timeZone: 'America/New_York',
    })

    expect(records.day).toMatchObject({
      bucketStart: '2026-02-28',
      label: 'Feb 28, 2026',
      gameCount: 2,
    })
    expect(records.week).toMatchObject({
      bucketStart: '2026-02-23',
      label: 'Week of Feb 23',
      gameCount: 3,
    })
    expect(records.month).toMatchObject({
      bucketStart: '2026-03-01',
      label: 'Mar 2026',
      gameCount: 3,
    })
  })

  it('breaks busiest-record ties by choosing the most recent local bucket', () => {
    const records = buildBusiestActivityRecords({
      playedAtIsos: [
        '2026-02-01T18:00:00.000Z',
        '2026-02-01T21:00:00.000Z',
        '2026-02-02T18:00:00.000Z',
        '2026-02-02T21:00:00.000Z',
        '2026-04-01T18:00:00.000Z',
        '2026-04-01T21:00:00.000Z',
        '2026-04-10T18:00:00.000Z',
        '2026-04-10T21:00:00.000Z',
      ],
      timeZone: 'America/New_York',
    })

    expect(records.day).toMatchObject({
      bucketStart: '2026-04-10',
      label: 'Apr 10, 2026',
      gameCount: 2,
    })
    expect(records.week).toMatchObject({
      bucketStart: '2026-04-06',
      label: 'Week of Apr 6',
      gameCount: 2,
    })
    expect(records.month).toMatchObject({
      bucketStart: '2026-04-01',
      label: 'Apr 2026',
      gameCount: 4,
    })
  })

  it('calculates the longest gap using idle-day semantics and prefers the most recent tied window', () => {
    const gap = buildLongestGameGap({
      playedAtIsos: [
        '2026-04-20T15:00:00.000Z',
        '2026-04-20T23:00:00.000Z',
        '2026-04-22T15:00:00.000Z',
        '2026-04-24T15:00:00.000Z',
      ],
      timeZone: 'America/New_York',
    })

    expect(gap).toEqual({
      idleDays: 1,
      startDate: '2026-04-22',
      endDate: '2026-04-24',
      startLabel: 'Apr 22, 2026',
      endLabel: 'Apr 24, 2026',
    })
  })

  it('returns a zero-day gap for same-day games and null when fewer than two games exist', () => {
    expect(
      buildLongestGameGap({
        playedAtIsos: [
          '2026-04-20T15:00:00.000Z',
          '2026-04-20T23:00:00.000Z',
        ],
        timeZone: 'America/New_York',
      }),
    ).toEqual({
      idleDays: 0,
      startDate: '2026-04-20',
      endDate: '2026-04-20',
      startLabel: 'Apr 20, 2026',
      endLabel: 'Apr 20, 2026',
    })

    expect(
      buildLongestGameGap({
        playedAtIsos: ['2026-04-20T15:00:00.000Z'],
        timeZone: 'America/New_York',
      }),
    ).toBeNull()
  })

  it('merges same local days in the heatmap and computes local day gaps from now', () => {
    const heatmap = buildCalendarHeatmapData({
      playedAtIsos: [
        '2026-04-21T01:00:00.000Z',
        '2026-04-21T03:00:00.000Z',
        '2026-04-22T14:00:00.000Z',
      ],
      timeZone: 'America/New_York',
      now: new Date('2026-04-22T16:00:00.000Z'),
    })

    expect(
      heatmap.recentDays.find((day) => day.date === '2026-04-20'),
    ).toMatchObject({
      label: 'Apr 20, 2026',
      gameCount: 2,
    })
    expect(
      heatmap.years.find((year) => year.year === 2026)?.days.find((day) => day.date === '2026-04-22'),
    ).toMatchObject({
      gameCount: 1,
    })
    expect(
      getDaysSinceLastGame({
        latestPlayedAtIso: '2026-04-21T03:30:00.000Z',
        now: new Date('2026-04-21T05:00:00.000Z'),
        timeZone: 'America/New_York',
      }),
    ).toBe(1)
  })

  it('extends the recent heatmap range through local today even when no games were played today', () => {
    const heatmap = buildCalendarHeatmapData({
      playedAtIsos: [
        '2026-04-21T01:00:00.000Z',
        '2026-04-21T03:00:00.000Z',
        '2026-04-22T14:00:00.000Z',
      ],
      timeZone: 'America/New_York',
      now: new Date('2026-04-24T16:00:00.000Z'),
    })

    expect(heatmap.recentRangeLabel).toBe('Apr 25, 2025 - Apr 24, 2026')
    expect(
      heatmap.recentDays.find((day) => day.date === '2026-04-24'),
    ).toMatchObject({
      label: 'Apr 24, 2026',
      gameCount: 0,
    })
    expect(
      heatmap.years.find((year) => year.year === 2026)?.days.find((day) => day.date === '2026-12-31'),
    ).toMatchObject({
      gameCount: 0,
    })
  })

  it('builds personal best week and month win records in local time and keeps the most recent tied bucket', () => {
    const players = [
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
      },
      {
        playerId: 3,
        name: 'Cara',
        tier: PlayerTier.Standard,
      },
    ]
    const winEvents = [
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playedAt: '2026-03-01T01:00:00.000Z',
      },
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playedAt: '2026-03-01T03:00:00.000Z',
      },
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playedAt: '2026-03-17T04:00:00.000Z',
      },
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playedAt: '2026-03-18T04:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        playedAt: '2026-03-03T05:00:00.000Z',
      },
    ]

    const weeklyRecords = buildPlayerBestWeekWinRecords({
      players,
      winEvents,
      timeZone: 'America/New_York',
    })
    const monthlyRecords = buildPlayerBestMonthWinRecords({
      players,
      winEvents,
      timeZone: 'America/New_York',
    })

    expect(weeklyRecords.find((player) => player.playerId === 1)).toMatchObject({
      wins: 2,
      periodStart: '2026-03-16',
      periodLabel: 'Week of Mar 16',
    })
    expect(weeklyRecords.find((player) => player.playerId === 2)).toMatchObject({
      wins: 1,
      periodStart: '2026-03-02',
      periodLabel: 'Week of Mar 2',
    })
    expect(weeklyRecords.find((player) => player.playerId === 3)).toMatchObject({
      wins: 0,
      periodStart: null,
      periodLabel: null,
    })

    expect(monthlyRecords.find((player) => player.playerId === 1)).toMatchObject({
      wins: 2,
      periodStart: '2026-03-01',
      periodLabel: 'Mar 2026',
    })
    expect(monthlyRecords.find((player) => player.playerId === 2)).toMatchObject({
      wins: 1,
      periodStart: '2026-03-01',
      periodLabel: 'Mar 2026',
    })
    expect(monthlyRecords.find((player) => player.playerId === 3)).toMatchObject({
      wins: 0,
      periodStart: null,
      periodLabel: null,
    })
  })

  it('builds current-month win records in local time, includes zero-win players, and sorts ties by most recent win', () => {
    const players = [
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
      },
      {
        playerId: 3,
        name: 'Cara',
        tier: PlayerTier.Standard,
      },
      {
        playerId: 4,
        name: 'Drew',
        tier: PlayerTier.Standard,
      },
    ]
    const winEvents = [
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playedAt: '2026-04-01T04:30:00.000Z',
      },
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playedAt: '2026-04-10T22:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        playedAt: '2026-04-05T16:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        playedAt: '2026-04-12T21:00:00.000Z',
      },
      {
        playerId: 3,
        name: 'Cara',
        tier: PlayerTier.Standard,
        playedAt: '2026-03-31T23:30:00.000Z',
      },
      {
        playerId: 3,
        name: 'Cara',
        tier: PlayerTier.Standard,
        playedAt: '2026-05-01T04:30:00.000Z',
      },
    ]

    const records = buildPlayerCurrentMonthWinRecords({
      players,
      winEvents,
      now: new Date('2026-04-15T12:00:00.000Z'),
      timeZone: 'America/New_York',
    })

    expect(records.map((player) => player.name)).toEqual(['Bea', 'Ada', 'Cara', 'Drew'])
    expect(records.find((player) => player.playerId === 1)).toMatchObject({
      wins: 2,
      periodStart: '2026-04-01',
      periodLabel: 'Apr 2026',
      mostRecentWin: '2026-04-10T22:00:00.000Z',
    })
    expect(records.find((player) => player.playerId === 2)).toMatchObject({
      wins: 2,
      periodStart: '2026-04-01',
      periodLabel: 'Apr 2026',
      mostRecentWin: '2026-04-12T21:00:00.000Z',
    })
    expect(records.find((player) => player.playerId === 3)).toMatchObject({
      wins: 0,
      periodStart: '2026-04-01',
      periodLabel: 'Apr 2026',
      mostRecentWin: null,
    })
    expect(records.find((player) => player.playerId === 4)).toMatchObject({
      wins: 0,
      periodStart: '2026-04-01',
      periodLabel: 'Apr 2026',
      mostRecentWin: null,
    })
  })

  it('uses the supplied local month boundary for current-month win records', () => {
    const records = buildPlayerCurrentMonthWinRecords({
      players: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
        },
      ],
      winEvents: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          playedAt: '2026-05-01T03:59:00.000Z',
        },
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          playedAt: '2026-05-01T04:00:00.000Z',
        },
      ],
      now: new Date('2026-05-01T04:30:00.000Z'),
      timeZone: 'America/New_York',
    })

    expect(records).toEqual([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        wins: 1,
        periodStart: '2026-05-01',
        periodLabel: 'May 2026',
        mostRecentWin: '2026-05-01T04:00:00.000Z',
      },
    ])
  })

  it('returns empty local-time structures when there is no activity', () => {
    expect(
      buildGamesOverTimeSeries({
        playedAtIsos: [],
        timeZone: 'America/New_York',
      }),
    ).toEqual({
      totalGames: 0,
      weekly: [],
      monthly: [],
    })

    expect(
      buildCalendarHeatmapData({
        playedAtIsos: [],
        timeZone: 'America/New_York',
      }),
    ).toEqual({
      recentDays: [],
      recentRangeLabel: null,
      years: [],
      defaultYear: null,
    })

    expect(
      buildSessionSummary({
        playedAtIsos: [],
        timeZone: 'America/New_York',
      }),
    ).toEqual({
      totalGames: 0,
      sessionCount: 0,
      averageGamesPerSession: 0,
    })

    expect(
      getDaysSinceLastGame({
        latestPlayedAtIso: null,
        now: new Date('2026-04-21T05:00:00.000Z'),
        timeZone: 'America/New_York',
      }),
    ).toBeNull()

    expect(
      isWithinRecentLocalCalendarDays({
        iso: null,
        now: new Date('2026-04-21T05:00:00.000Z'),
        timeZone: 'America/New_York',
        days: 7,
      }),
    ).toBe(false)

    expect(
      buildPlayerBestWeekWinRecords({
        players: [],
        winEvents: [],
        timeZone: 'America/New_York',
      }),
    ).toEqual([])

    expect(
      buildPlayerBestMonthWinRecords({
        players: [],
        winEvents: [],
        timeZone: 'America/New_York',
      }),
    ).toEqual([])

    expect(
      buildPlayerCurrentMonthWinRecords({
        players: [],
        winEvents: [],
        now: new Date('2026-04-21T05:00:00.000Z'),
        timeZone: 'America/New_York',
      }),
    ).toEqual([])
  })

  it('uses the viewer local calendar when checking recent-day eligibility', () => {
    expect(
      isWithinRecentLocalCalendarDays({
        iso: '2026-04-17T23:30:00.000Z',
        now: new Date('2026-04-23T12:00:00.000Z'),
        timeZone: 'America/New_York',
        days: 7,
      }),
    ).toBe(true)

    expect(
      isWithinRecentLocalCalendarDays({
        iso: '2026-04-16T23:30:00.000Z',
        now: new Date('2026-04-23T12:00:00.000Z'),
        timeZone: 'America/New_York',
        days: 7,
      }),
    ).toBe(false)
  })

  it('normalizes midnight hour 24 into the 12 AM bucket', () => {
    const OriginalDateTimeFormat = Intl.DateTimeFormat
    // Vitest requires a constructable function when spying on this constructor.
    // eslint-disable-next-line prefer-arrow-callback
    const dateTimeFormatSpy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function mockDateTimeFormat(
      locales,
      options,
    ) {
      if (options?.timeZone === 'Etc/Test-Midnight') {
        return {
          formatToParts: () => [
            { type: 'weekday', value: 'Tue' },
            { type: 'year', value: '2026' },
            { type: 'month', value: '4' },
            { type: 'day', value: '21' },
            { type: 'hour', value: '24' },
          ],
        } as Intl.DateTimeFormat
      }

      return new OriginalDateTimeFormat(locales, options)
    })

    try {
      const timeOfDayPattern = buildTimeOfDayPattern({
        playedAtIsos: ['2026-04-21T04:00:00.000Z'],
        timeZone: 'Etc/Test-Midnight',
      })

      expect(timeOfDayPattern).toHaveLength(24)
      expect(timeOfDayPattern[0]).toMatchObject({ label: '12 AM', gameCount: 1 })
      expect(timeOfDayPattern.some((bucket) => Number.isNaN(bucket.gameCount))).toBe(false)
    } finally {
      dateTimeFormatSpy.mockRestore()
    }
  })
})
