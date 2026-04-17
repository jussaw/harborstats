'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createGame } from '@/lib/games'

export async function createGameAction(formData: FormData) {
  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0].trim() ??
    hdrs.get('x-real-ip') ??
    null

  const playedAt = new Date(formData.get('played_at') as string)
  const notes = (formData.get('notes') as string) ?? ''

  const players: { playerId: number; score: number; isWinner: boolean }[] = []
  let row = 0
  while (formData.has(`player_id_${row}`)) {
    const playerId = formData.get(`player_id_${row}`) as string
    const score = formData.get(`score_${row}`) as string
    const isWinner = formData.get(`is_winner_${row}`) === '1'

    if (playerId && score !== null && score !== '') {
      players.push({
        playerId: Number(playerId),
        score: Number(score),
        isWinner,
      })
    }
    row++
  }

  await createGame({ playedAt, notes, submittedFromIp: ip, players })
  redirect('/')
}
