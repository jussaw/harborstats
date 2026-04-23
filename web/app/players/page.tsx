import { PlayersSection } from '@/components/PlayersSection'
import { listGamesForPlayer } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import {
  getPlayerCumulativeScoreStats,
  getPlayerCurrentWinStreaks,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerStreakRecords,
  getPlayerWinEvents,
  getPlayerWinRateByGameSize,
} from '@/lib/stats'

export const dynamic = 'force-dynamic'

export default async function PlayersPage() {
  const [
    players,
    scoreStats,
    cumulativeScoreStats,
    podiumRates,
    finishBreakdowns,
    marginStats,
    participationRates,
    winRateByGameSize,
    expectedVsActualWins,
    currentWinStreaks,
    playerWinEvents,
    playerStreakRecords,
  ] = await Promise.all([
    getPlayers(),
    getPlayerScoreStats(),
    getPlayerCumulativeScoreStats(),
    getPlayerPodiumRates(),
    getPlayerFinishBreakdowns(),
    getPlayerMarginStats(),
    getPlayerParticipationRates(),
    getPlayerWinRateByGameSize(),
    getPlayerExpectedVsActualWins(),
    getPlayerCurrentWinStreaks(),
    getPlayerWinEvents(),
    getPlayerStreakRecords(),
  ])
  const selectedPlayer = players[0] ?? null
  const playerGames = selectedPlayer ? await listGamesForPlayer(selectedPlayer.id) : []

  return (
    <PlayersSection
      players={players}
      selectedPlayer={selectedPlayer}
      mobileMode="list"
      scoreStats={scoreStats}
      cumulativeScoreStats={cumulativeScoreStats}
      podiumRates={podiumRates}
      finishBreakdowns={finishBreakdowns}
      marginStats={marginStats}
      participationRates={participationRates}
      winRateByGameSize={winRateByGameSize}
      expectedVsActualWins={expectedVsActualWins}
      currentWinStreaks={currentWinStreaks}
      playerWinEvents={playerWinEvents}
      playerStreakRecords={playerStreakRecords}
      playerGames={playerGames}
    />
  )
}
