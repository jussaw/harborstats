'use client'

import { GameForm } from '@/components/GameForm'
import { updateGameAction } from '@/app/admin/games/actions'
import type { Player } from '@/lib/players'
import type { GameFormInitial } from '@/components/GameForm'

interface Props {
  gameId: number
  players: Player[]
  initial: GameFormInitial
}

export function EditGameForm({ gameId, players, initial }: Props) {
  return (
    <GameForm
      action={updateGameAction}
      players={players}
      initial={initial}
      submitLabel="Save Changes"
      hiddenFields={{ game_id: String(gameId) }}
    />
  )
}
