import type { Metadata } from 'next'
import { FormattedDate } from '@/components/FormattedDate'
import { GamesFilters } from '@/components/GamesFilters'
import { GamesPagination } from '@/components/GamesPagination'
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
  const filtersKey = [
    pageSize,
    filters.playerIds.join(','),
    filters.from?.toISOString() ?? '',
    filters.to?.toISOString() ?? '',
  ].join('|')

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="text-xl text-[var(--gold)] tracking-wide">Games</h1>
          <p className="mt-1 text-xs text-[var(--cream)]/50">{totalGames} recorded</p>
        </div>
        <GamesFilters key={filtersKey} players={players} pageSize={pageSize} filters={filters} />
        <GamesPagination page={page} pageSize={pageSize} totalPages={totalPages} filters={filters} />
      </div>

      {games.length === 0 ? (
        <p className="text-[var(--cream)] opacity-60 text-center py-16">
          {hasActiveFilters ? 'No games match those filters.' : 'No games yet — record your first one!'}
        </p>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <article
              key={game.id}
              className="rounded-lg border border-[var(--gold)]/30 bg-[var(--navy-900)]/60 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <FormattedDate iso={game.playedAt.toISOString()} className="text-xs text-[var(--cream)] opacity-60" />
                {game.notes && (
                  <p className="text-xs text-[var(--cream)] opacity-50 italic max-w-xs text-right">
                    {game.notes}
                  </p>
                )}
              </div>

              <ul className="space-y-1">
                {[...game.players].sort((a, b) => b.score - a.score).map((player) => (
                  <li key={player.playerName} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-center">
                      {player.isWinner ? '⭐' : ''}
                    </span>
                    <span
                      className={
                        player.isWinner ? 'text-[var(--gold)] font-semibold' : 'text-[var(--cream)]'
                      }
                    >
                      {player.playerName}
                    </span>
                    <span className="ml-auto text-[var(--cream)] opacity-70 tabular-nums">
                      {player.score}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
