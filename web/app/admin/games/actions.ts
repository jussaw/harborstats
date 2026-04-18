'use server'

import { redirect } from 'next/navigation'
import { updateGame, deleteGame, parseGameFormData } from '@/lib/games'

export async function updateGameAction(formData: FormData) {
  const gameId = Number(formData.get('game_id'))
  const { playedAt, notes, players } = parseGameFormData(formData)
  await updateGame(gameId, { playedAt, notes, players })
  redirect('/admin/games')
}

export async function deleteGameAction(formData: FormData) {
  const gameId = Number(formData.get('game_id'))
  await deleteGame(gameId)
  redirect('/admin/games')
}
