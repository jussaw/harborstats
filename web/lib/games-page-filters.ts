import { GAMES_PAGE_SIZES, type GamesPageFilters, type GamesPageSize } from '@/lib/games-page-shared'

type SearchParamValue = string | string[] | undefined

interface GamesPageState {
  page: number
  pageSize: GamesPageSize
  filters: GamesPageFilters
}

function parsePositiveInt(value: string | undefined) {
  if (!value || !/^[1-9]\d*$/.test(value)) return null
  return Number.parseInt(value, 10)
}

function parsePageSize(value: string | undefined): GamesPageSize {
  const parsed = parsePositiveInt(value)
  return GAMES_PAGE_SIZES.includes(parsed as GamesPageSize) ? (parsed as GamesPageSize) : 20
}

function getFirstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value
}

function getAllValues(value: SearchParamValue) {
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

function parseDateValue(value: SearchParamValue) {
  const raw = getFirstValue(value)
  if (!raw) return null
  const parsed = new Date(raw)
  return Number.isNaN(parsed.valueOf()) ? null : parsed
}

// Accepts both the hyphen-delimited form (`player=1-3`) and the legacy repeated form
// (`player=1&player=3`) so old shared links keep working.
function parsePlayerIds(value: SearchParamValue) {
  const parsedIds = getAllValues(value)
    .flatMap((entry) => entry.split('-'))
    .map((entry) => parsePositiveInt(entry))
    .filter((entry): entry is number => entry !== null)

  return [...new Set(parsedIds)]
}

export function parseGamesPageState(params: {
  page?: SearchParamValue
  pageSize?: SearchParamValue
  player?: SearchParamValue
  from?: SearchParamValue
  to?: SearchParamValue
}): GamesPageState {
  return {
    page: parsePositiveInt(getFirstValue(params.page)) ?? 1,
    pageSize: parsePageSize(getFirstValue(params.pageSize)),
    filters: {
      playerIds: parsePlayerIds(params.player),
      from: parseDateValue(params.from),
      to: parseDateValue(params.to),
    },
  }
}

export function hasActiveGamesPageFilters(filters: GamesPageFilters) {
  return filters.playerIds.length > 0 || filters.from !== null || filters.to !== null
}

export function createGamesSearchParams(input: {
  page?: number
  pageSize?: GamesPageSize
  filters: GamesPageFilters
}) {
  const params = new URLSearchParams()

  if (input.page && input.page > 0) {
    params.set('page', String(input.page))
  }

  if (input.pageSize) {
    params.set('pageSize', String(input.pageSize))
  }

  // A single hyphen-delimited param (rather than one `player=<id>` per selection) is deliberate:
  // the Next.js client router cache collapses repeated search params to their last value when
  // building cache keys, so URLs that share a final id collide and render stale content
  // (https://github.com/vercel/next.js/issues/92152).
  if (input.filters.playerIds.length > 0) {
    params.set('player', input.filters.playerIds.join('-'))
  }

  if (input.filters.from) {
    params.set('from', input.filters.from.toISOString())
  }

  if (input.filters.to) {
    params.set('to', input.filters.to.toISOString())
  }

  return params
}
