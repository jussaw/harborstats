import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGameForEdit } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import type { GameFormInitial } from '@/components/GameForm'
import { PageWidth } from '@/components/PageWidth'
import { EditGameForm } from './EditGameForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditGamePage({ params }: Props) {
  const { id } = await params
  const gameId = Number(id)

  const [game, players] = await Promise.all([getGameForEdit(gameId), getPlayers()])
  if (!game) notFound()

  const initial: GameFormInitial = {
    played_at: game.playedAt.toISOString(),
    notes: game.notes,
    rows: game.players.map((p) => ({
      playerId: p.playerId,
      score: p.score,
      isWinner: p.isWinner,
    })),
  }

  return (
    <PageWidth width="5xl" className="px-6 py-8">
      <PageWidth as="div" width="2xl" className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/games"
            className="
              text-xs text-(--cream)/40 transition-colors
              hover:text-(--cream)/70
            "
          >
            ← Games
          </Link>
          <span className="text-(--cream)/20">/</span>
          <h1 className="font-cinzel text-xl tracking-wide text-(--gold)">
            Edit Game <span className="text-(--gold)/50">#{game.id}</span>
          </h1>
        </div>
        <EditGameForm gameId={game.id} players={players} initial={initial} />
      </PageWidth>
    </PageWidth>
  )
}
