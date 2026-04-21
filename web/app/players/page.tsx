import { PlayersSection } from '@/components/PlayersSection'
import { getPlayers } from '@/lib/players'
import {
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerPodiumRates,
  getPlayerScoreStats,
} from '@/lib/stats'

export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const [players, scoreStats, podiumRates, finishBreakdowns, marginStats] = await Promise.all([
    getPlayers(),
    getPlayerScoreStats(),
    getPlayerPodiumRates(),
    getPlayerFinishBreakdowns(),
    getPlayerMarginStats(),
  ])
  const selectedPlayer = players[0] ?? null

  return (
    <PlayersSection
      players={players}
      selectedPlayer={selectedPlayer}
      mobileMode="list"
      scoreStats={scoreStats}
      podiumRates={podiumRates}
      finishBreakdowns={finishBreakdowns}
      marginStats={marginStats}
    />
  )
}
