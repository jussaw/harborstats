import { PlayersSection } from '@/components/PlayersSection'
import { getPlayers } from '@/lib/players'
import {
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerWinRateByGameSize,
} from '@/lib/stats'

export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const [
    players,
    scoreStats,
    podiumRates,
    finishBreakdowns,
    marginStats,
    winRateByGameSize,
    expectedVsActualWins,
  ] = await Promise.all([
    getPlayers(),
    getPlayerScoreStats(),
    getPlayerPodiumRates(),
    getPlayerFinishBreakdowns(),
    getPlayerMarginStats(),
    getPlayerWinRateByGameSize(),
    getPlayerExpectedVsActualWins(),
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
      winRateByGameSize={winRateByGameSize}
      expectedVsActualWins={expectedVsActualWins}
    />
  )
}
