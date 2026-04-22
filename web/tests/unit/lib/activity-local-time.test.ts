import { describe, expect, it, vi } from 'vitest'
import {
  buildCalendarHeatmapData,
  buildDayOfWeekPattern,
  buildGamesOverTimeSeries,
  buildSessionSummary,
  buildTimeOfDayPattern,
  getDaysSinceLastGame,
} from '@/lib/activity-local-time'

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
  })

  it('normalizes midnight hour 24 into the 12 AM bucket', () => {
    const originalDateTimeFormat = Intl.DateTimeFormat
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

      return new originalDateTimeFormat(locales, options)
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
