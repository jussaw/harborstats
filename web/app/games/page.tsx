import type { Metadata } from 'next'
import { GameCard } from '@/components/GameCard'
import { GamesFilters } from '@/components/GamesFilters'
import { GamesPagination } from '@/components/GamesPagination'
import { PageWidth } from '@/components/PageWidth'
import { hasActiveGamesPageFilters, parseGamesPageState } from '@/lib/games-page-filters'
import { listGamesPage } from '@/lib/games'
import { getPlayers } from '@/lib/players'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Games — HarborStats' }

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function GamesPage({ searchParams }: Props) {
  const [params, players] = await Promise.all([searchParams, getPlayers()])
  const { page: requestedPage, pageSize, filters } = parseGamesPageState(params)
  const { games, totalGames, page, totalPages } = await listGamesPage(requestedPage, pageSize, filters)
  const hasActiveFilters = hasActiveGamesPageFilters(filters)

  return (
    <PageWidth width="2xl" className="px-4 py-12">
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="font-cinzel text-2xl tracking-wide text-(--cream)">Games</h1>
          <p className="mt-1 text-xs text-(--cream)/50">{totalGames} recorded</p>
        </div>
        <GamesFilters players={players} pageSize={pageSize} filters={filters} />
        <GamesPagination page={page} pageSize={pageSize} totalPages={totalPages} filters={filters} />
      </div>

      {games.length === 0 ? (
        <p className="py-16 text-center text-(--cream) opacity-60">
          {hasActiveFilters ? 'No games match those filters.' : 'No games yet — record your first one!'}
        </p>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      )}
    </PageWidth>
  )
}
