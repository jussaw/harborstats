'use client'

import { GameForm } from '@/components/GameForm'
import { createGameAction } from '@/app/actions'
import type { Player } from '@/lib/players'

interface Props {
  players: Player[]
}

export function NewGameForm({ players }: Props) {
  return <GameForm action={createGameAction} players={players} />
}
