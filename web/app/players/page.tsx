import { PlayersSection } from '@/components/PlayersSection'
import { getPlayers } from '@/lib/players'
import { getPlayerPodiumRates, getPlayerScoreStats } from '@/lib/stats'

export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const [players, scoreStats, podiumRates] = await Promise.all([
    getPlayers(),
    getPlayerScoreStats(),
    getPlayerPodiumRates(),
  ])
  const selectedPlayer = players[0] ?? null

  return (
    <PlayersSection
      players={players}
      selectedPlayer={selectedPlayer}
      mobileMode="list"
      scoreStats={scoreStats}
      podiumRates={podiumRates}
    />
  )
}
