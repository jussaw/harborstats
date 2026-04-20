import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PlayersSection } from '@/components/PlayersSection'
import { getPlayerById, getPlayers } from '@/lib/players'

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

  const players = await getPlayers()
  const player = players.find((candidate) => candidate.id === numericId) ?? null
  if (!player) notFound()

  return <PlayersSection players={players} selectedPlayer={player} mobileMode="detail" />
}
