import { PlayersSection } from '@/components/PlayersSection';
import { listGamesForPlayer } from '@/lib/games';
import { getPlayers } from '@/lib/players';
import {
  getPlayerCumulativeScoreStats,
  getPlayerCurrentWinStreaks,
  getPerPlayerScoreDistributions,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerHeadToHeadRecords,
  getPlayerMarginStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerStreakRecords,
  getPlayerWinEvents,
  getPlayerWinRateByGameSize,
} from '@/lib/stats';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  const [
    players,
    scoreStats,
    scoreDistributions,
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
    headToHeadRecords,
  ] = await Promise.all([
    getPlayers(),
    getPlayerScoreStats(),
    getPerPlayerScoreDistributions(),
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
    getPlayerHeadToHeadRecords(),
  ]);
  const selectedPlayer = players[0] ?? null;
  const playerGames = selectedPlayer ? await listGamesForPlayer(selectedPlayer.id) : [];

  return (
    <PlayersSection
      players={players}
      selectedPlayer={selectedPlayer}
      mobileMode="list"
      scoreStats={scoreStats}
      scoreDistributions={scoreDistributions}
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
      headToHeadRecords={headToHeadRecords}
    />
  );
}
