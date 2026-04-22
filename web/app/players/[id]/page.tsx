import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PlayersSection } from '@/components/PlayersSection'
import { listGamesForPlayer } from '@/lib/games'
import { getPlayerById, getPlayers } from '@/lib/players'
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

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const player = await getPlayerById(parseInt(id, 10))
  return { title: player ? `${player.name} — HarborStats` : 'Player — HarborStats' }
}

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (Number.isNaN(numericId)) notFound()

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
    playerGames,
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
    listGamesForPlayer(numericId),
  ])
  const player = players.find((candidate) => candidate.id === numericId) ?? null
  if (!player) notFound()

  return (
    <PlayersSection
      players={players}
      selectedPlayer={player}
      mobileMode="detail"
      scoreStats={scoreStats}
      podiumRates={podiumRates}
      finishBreakdowns={finishBreakdowns}
      marginStats={marginStats}
      participationRates={participationRates}
      winRateByGameSize={winRateByGameSize}
      expectedVsActualWins={expectedVsActualWins}
      currentWinStreaks={currentWinStreaks}
      playerWinEvents={playerWinEvents}
      playerGames={playerGames}
    />
  )
}
