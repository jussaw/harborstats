import { PlayersSection } from '@/components/PlayersSection'
import { getPlayers } from '@/lib/players'
import {
  getPlayerCurrentWinStreaks,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerWinEvents,
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
    participationRates,
    winRateByGameSize,
    expectedVsActualWins,
    currentWinStreaks,
    playerWinEvents,
  ] = await Promise.all([
    getPlayers(),
    getPlayerScoreStats(),
    getPlayerPodiumRates(),
    getPlayerFinishBreakdowns(),
    getPlayerMarginStats(),
    getPlayerParticipationRates(),
    getPlayerWinRateByGameSize(),
    getPlayerExpectedVsActualWins(),
    getPlayerCurrentWinStreaks(),
    getPlayerWinEvents(),
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
      participationRates={participationRates}
      winRateByGameSize={winRateByGameSize}
      expectedVsActualWins={expectedVsActualWins}
      currentWinStreaks={currentWinStreaks}
      playerWinEvents={playerWinEvents}
    />
  )
}
