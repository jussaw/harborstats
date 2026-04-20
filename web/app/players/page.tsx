import { PlayersSection } from '@/components/PlayersSection'
import { getPlayers } from '@/lib/players'

export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const players = await getPlayers()
  const selectedPlayer = players[0] ?? null

  return <PlayersSection players={players} selectedPlayer={selectedPlayer} mobileMode="list" />
}
