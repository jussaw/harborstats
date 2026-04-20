export const GAMES_PAGE_SIZES = [20, 50, 100] as const

export type GamesPageSize = (typeof GAMES_PAGE_SIZES)[number]

export interface GamesPageFilters {
  playerIds: number[]
  from: Date | null
  to: Date | null
}
