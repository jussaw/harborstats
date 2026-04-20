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

function parsePlayerIds(value: SearchParamValue) {
  const parsedIds = getAllValues(value)
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

  input.filters.playerIds.forEach((playerId) => {
    params.append('player', String(playerId))
  })

  if (input.filters.from) {
    params.set('from', input.filters.from.toISOString())
  }

  if (input.filters.to) {
    params.set('to', input.filters.to.toISOString())
  }

  return params
}
