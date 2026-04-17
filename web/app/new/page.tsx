import { getPlayers } from '@/lib/players'
import { NewGameForm } from './NewGameForm'

export const dynamic = 'force-dynamic'

export default async function NewGamePage() {
  const players = await getPlayers()
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-cinzel mb-8 text-3xl text-[var(--gold)] tracking-wide">
        New Game
      </h1>
      <NewGameForm players={players} />
    </main>
  )
}
