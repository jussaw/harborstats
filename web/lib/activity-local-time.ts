import type { PlayerTier as PlayerTierType } from '@/lib/player-tier'

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

const millisecondsPerDay = 24 * 60 * 60 * 1000
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

const localDatePartFormatters = new Map<string, Intl.DateTimeFormat>()

function getLocalDatePartFormatter(timeZone: string): Intl.DateTimeFormat {
  const existing = localDatePartFormatters.get(timeZone)
  if (existing) {
    return existing
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    hour12: false,
  })

  localDatePartFormatters.set(timeZone, formatter)
  return formatter
}

function getFormatterPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  return parts.find((part) => part.type === type)?.value ?? ''
}

function normalizeLocalHour(value: string): number {
  const parsedHour = Number(value)

  if (!Number.isFinite(parsedHour)) {
    return 0
  }

  if (parsedHour === 24) {
    return 0
  }

  if (parsedHour < 0 || parsedHour > 23) {
    return 0
  }

  return parsedHour
}

function getLocalParts(input: string | Date, timeZone: string) {
  const parts = getLocalDatePartFormatter(timeZone).formatToParts(new Date(input))

  return {
    weekday: getFormatterPart(parts, 'weekday'),
    year: Number(getFormatterPart(parts, 'year')),
    month: Number(getFormatterPart(parts, 'month')),
    day: Number(getFormatterPart(parts, 'day')),
    hour: normalizeLocalHour(getFormatterPart(parts, 'hour')),
  }
}

function toUtcCalendarDate(input: string | Date, timeZone: string): Date {
  const parts = getLocalParts(input, timeZone)
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function getIsoWeekStart(date: Date): Date {
  const start = startOfUtcDay(date)
  const day = start.getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  start.setUTCDate(start.getUTCDate() - offset)
  return start
}

function getUtcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
})

const shortMonthFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  year: 'numeric',
})

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function formatShortUtcDate(date: Date): string {
  return shortDateFormatter.format(date)
}

function formatShortUtcMonth(date: Date): string {
  return shortMonthFormatter.format(date)
}

function formatLongUtcDate(date: Date): string {
  return longDateFormatter.format(date)
}

function getOrderedLocalDays(playedAtIsos: string[], timeZone: string): Date[] {
  return playedAtIsos.map((playedAtIso) => toUtcCalendarDate(playedAtIso, timeZone))
}

function buildBucketStarts(
  localDays: Date[],
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
): Date[] {
  if (localDays.length === 0) {
    return []
  }

  const firstBucket = getBucketStart(localDays[0])
  const lastBucket = getBucketStart(localDays[localDays.length - 1])
  const bucketStarts: Date[] = []

  for (
    let bucketStart = firstBucket;
    bucketStart.getTime() <= lastBucket.getTime();
    bucketStart = getNextBucketStart(bucketStart)
  ) {
    bucketStarts.push(bucketStart)
  }

  return bucketStarts
}

export interface ActivityBucket {
  bucketStart: string
  label: string
  gameCount: number
}

export interface GamesOverTimeSeries {
  weekly: ActivityBucket[]
  monthly: ActivityBucket[]
  totalGames: number
}

function buildActivityBuckets(
  localDays: Date[],
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
  formatLabel: (date: Date) => string,
): ActivityBucket[] {
  if (localDays.length === 0) {
    return []
  }

  const countsByBucket = new Map<string, number>()

  localDays.forEach((localDay) => {
    const bucketStart = getBucketStart(localDay)
    const bucketKey = toUtcDateKey(bucketStart)
    countsByBucket.set(bucketKey, (countsByBucket.get(bucketKey) ?? 0) + 1)
  })

  return buildBucketStarts(localDays, getBucketStart, getNextBucketStart).map((bucketStart) => {
    const bucketKey = toUtcDateKey(bucketStart)

    return {
      bucketStart: bucketKey,
      label: formatLabel(bucketStart),
      gameCount: countsByBucket.get(bucketKey) ?? 0,
    }
  })
}

export function buildGamesOverTimeSeries({
  playedAtIsos,
  timeZone,
}: {
  playedAtIsos: string[]
  timeZone: string
}): GamesOverTimeSeries {
  const localDays = getOrderedLocalDays(playedAtIsos, timeZone)

  return {
    weekly: buildActivityBuckets(localDays, getIsoWeekStart, (date) => addUtcDays(date, 7), formatShortUtcDate),
    monthly: buildActivityBuckets(
      localDays,
      getUtcMonthStart,
      (date) => addUtcMonths(date, 1),
      formatShortUtcMonth,
    ),
    totalGames: playedAtIsos.length,
  }
}

export interface PlayerAttendanceEvent {
  playedAt: string
  playerId: number
  name: string
  tier: PlayerTierType
}

export interface PlayerAttendanceSegment {
  playerId: number
  name: string
  tier: PlayerTierType
  gameCount: number
}

export interface PlayerAttendanceBucket {
  bucketStart: string
  label: string
  totalAppearances: number
  segments: PlayerAttendanceSegment[]
}

export interface PlayerAttendanceSeries {
  weekly: PlayerAttendanceBucket[]
  monthly: PlayerAttendanceBucket[]
}

function buildPlayerAttendanceBuckets(
  events: PlayerAttendanceEvent[],
  localDays: Date[],
  timeZone: string,
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
  formatLabel: (date: Date) => string,
): PlayerAttendanceBucket[] {
  if (events.length === 0) {
    return []
  }

  const segmentsByBucket = new Map<string, Map<number, PlayerAttendanceSegment>>()

  events.forEach((event) => {
    const localDay = toUtcCalendarDate(event.playedAt, timeZone)
    const bucketStart = getBucketStart(localDay)
    const bucketKey = toUtcDateKey(bucketStart)
    const bucketSegments = segmentsByBucket.get(bucketKey) ?? new Map<number, PlayerAttendanceSegment>()
    const existing = bucketSegments.get(event.playerId) ?? {
      playerId: event.playerId,
      name: event.name,
      tier: event.tier,
      gameCount: 0,
    }

    existing.gameCount += 1
    bucketSegments.set(event.playerId, existing)
    segmentsByBucket.set(bucketKey, bucketSegments)
  })

  return buildBucketStarts(localDays, getBucketStart, getNextBucketStart).map((bucketStart) => {
    const bucketKey = toUtcDateKey(bucketStart)
    const segments = [...(segmentsByBucket.get(bucketKey)?.values() ?? [])].sort(
      (a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name),
    )

    return {
      bucketStart: bucketKey,
      label: formatLabel(bucketStart),
      totalAppearances: segments.reduce((total, segment) => total + segment.gameCount, 0),
      segments,
    }
  })
}

export function buildPlayerAttendanceSeries({
  events,
  timeZone,
}: {
  events: PlayerAttendanceEvent[]
  timeZone: string
}): PlayerAttendanceSeries {
  const localDays = events.map((event) => toUtcCalendarDate(event.playedAt, timeZone))

  return {
    weekly: buildPlayerAttendanceBuckets(
      events,
      localDays,
      timeZone,
      getIsoWeekStart,
      (date) => addUtcDays(date, 7),
      formatShortUtcDate,
    ),
    monthly: buildPlayerAttendanceBuckets(
      events,
      localDays,
      timeZone,
      getUtcMonthStart,
      (date) => addUtcMonths(date, 1),
      formatShortUtcMonth,
    ),
  }
}

export interface CalendarHeatmapDay {
  date: string
  label: string
  gameCount: number
}

export interface CalendarHeatmapYear {
  year: number
  days: CalendarHeatmapDay[]
  totalGames: number
}

export interface CalendarHeatmapData {
  recentDays: CalendarHeatmapDay[]
  recentRangeLabel: string | null
  years: CalendarHeatmapYear[]
  defaultYear: number | null
}

function buildUtcDateRange(start: Date, end: Date): Date[] {
  const days: Date[] = []

  for (
    let current = startOfUtcDay(start);
    current.getTime() <= startOfUtcDay(end).getTime();
    current = addUtcDays(current, 1)
  ) {
    days.push(current)
  }

  return days
}

function buildCalendarHeatmapDays(
  start: Date,
  end: Date,
  countsByDay: Map<string, number>,
): CalendarHeatmapDay[] {
  return buildUtcDateRange(start, end).map((day) => {
    const dateKey = toUtcDateKey(day)

    return {
      date: dateKey,
      label: formatLongUtcDate(day),
      gameCount: countsByDay.get(dateKey) ?? 0,
    }
  })
}

export function buildCalendarHeatmapData({
  playedAtIsos,
  timeZone,
}: {
  playedAtIsos: string[]
  timeZone: string
}): CalendarHeatmapData {
  const localDays = getOrderedLocalDays(playedAtIsos, timeZone)

  if (localDays.length === 0) {
    return {
      recentDays: [],
      recentRangeLabel: null,
      years: [],
      defaultYear: null,
    }
  }

  const countsByDay = new Map<string, number>()

  localDays.forEach((localDay) => {
    const dateKey = toUtcDateKey(localDay)
    countsByDay.set(dateKey, (countsByDay.get(dateKey) ?? 0) + 1)
  })

  const latestDay = localDays[localDays.length - 1]
  const recentStart = addUtcDays(
    new Date(Date.UTC(latestDay.getUTCFullYear() - 1, latestDay.getUTCMonth(), latestDay.getUTCDate())),
    1,
  )
  const firstRecordedYear = localDays[0].getUTCFullYear()
  const lastRecordedYear = latestDay.getUTCFullYear()
  const years: CalendarHeatmapYear[] = []

  for (let year = lastRecordedYear; year >= firstRecordedYear; year -= 1) {
    const start = new Date(Date.UTC(year, 0, 1))
    const end = new Date(Date.UTC(year, 11, 31))
    const days = buildCalendarHeatmapDays(start, end, countsByDay)
    const totalGames = days.reduce((total, day) => total + day.gameCount, 0)

    if (totalGames > 0) {
      years.push({ year, days, totalGames })
    }
  }

  return {
    recentDays: buildCalendarHeatmapDays(recentStart, latestDay, countsByDay),
    recentRangeLabel: `${formatLongUtcDate(recentStart)} - ${formatLongUtcDate(latestDay)}`,
    years,
    defaultYear: lastRecordedYear,
  }
}

export interface DistributionBucket {
  key: string
  label: string
  gameCount: number
}

export function buildDayOfWeekPattern({
  playedAtIsos,
  timeZone,
}: {
  playedAtIsos: string[]
  timeZone: string
}): DistributionBucket[] {
  const counts = Array.from({ length: 7 }, () => 0)

  playedAtIsos.forEach((playedAtIso) => {
    const localDay = toUtcCalendarDate(playedAtIso, timeZone)
    counts[localDay.getUTCDay()] += 1
  })

  return weekdayLabels.map((label, index) => ({
    key: label.toLowerCase(),
    label,
    gameCount: counts[index],
  }))
}

function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

export function buildTimeOfDayPattern({
  playedAtIsos,
  timeZone,
}: {
  playedAtIsos: string[]
  timeZone: string
}): DistributionBucket[] {
  const counts = Array.from({ length: 24 }, () => 0)

  playedAtIsos.forEach((playedAtIso) => {
    const localHour = getLocalParts(playedAtIso, timeZone).hour

    if (Number.isInteger(localHour) && localHour >= 0 && localHour <= 23) {
      counts[localHour] += 1
    }
  })

  return counts.map((gameCount, hour) => ({
    key: String(hour),
    label: formatHourLabel(hour),
    gameCount,
  }))
}

export interface SessionSummary {
  totalGames: number
  sessionCount: number
  averageGamesPerSession: number
}

export function buildSessionSummary({
  playedAtIsos,
  timeZone,
}: {
  playedAtIsos: string[]
  timeZone: string
}): SessionSummary {
  const sessionCounts = new Map<string, number>()

  playedAtIsos.forEach((playedAtIso) => {
    const localDateKey = toUtcDateKey(toUtcCalendarDate(playedAtIso, timeZone))
    sessionCounts.set(localDateKey, (sessionCounts.get(localDateKey) ?? 0) + 1)
  })

  const sessionCount = sessionCounts.size

  return {
    totalGames: playedAtIsos.length,
    sessionCount,
    averageGamesPerSession: sessionCount > 0 ? round1(playedAtIsos.length / sessionCount) : 0,
  }
}

export function getDaysSinceLastGame({
  latestPlayedAtIso,
  now,
  timeZone,
}: {
  latestPlayedAtIso: string | null
  now: Date
  timeZone: string
}): number | null {
  if (!latestPlayedAtIso) {
    return null
  }

  const latestLocalDay = toUtcCalendarDate(latestPlayedAtIso, timeZone)
  const currentLocalDay = toUtcCalendarDate(now, timeZone)

  return Math.floor((currentLocalDay.getTime() - latestLocalDay.getTime()) / millisecondsPerDay)
}
