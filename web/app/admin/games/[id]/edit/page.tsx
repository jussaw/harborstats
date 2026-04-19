import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getGameForEdit } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { EditGameForm } from './EditGameForm'
import { AdminShell } from '@/app/admin/AdminShell'
import type { GameFormInitial } from '@/components/GameForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditGamePage({ params }: Props) {
  const { id } = await params
  const gameId = Number(id)

  const [game, players] = await Promise.all([getGameForEdit(gameId), getPlayers()])
  if (!game) notFound()

  const initial: GameFormInitial = {
    played_at: new Date(game.played_at).toISOString(),
    notes: game.notes,
    rows: game.players.map((p) => ({
      playerId: p.playerId,
      score: p.score,
      isWinner: p.isWinner,
    })),
  }

  return (
    <AdminShell>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/games"
            className="text-xs text-[var(--cream)]/40 hover:text-[var(--cream)]/70 transition-colors"
          >
            ← Games
          </Link>
          <span className="text-[var(--cream)]/20">/</span>
          <h1 className="font-cinzel text-xl tracking-wide text-[var(--gold)]">
            Edit Game <span className="text-[var(--gold)]/50">#{game.id}</span>
          </h1>
        </div>
        <EditGameForm gameId={game.id} players={players} initial={initial} />
      </div>
    </AdminShell>
  )
}
