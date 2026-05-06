'use server'

import { headers } from 'next/headers'
import { createGame, parseGameFormData } from '@/lib/games'
import { isGameSession } from '@/lib/game-auth'

export async function createGameAction(formData: FormData) {
  if (!(await isGameSession())) {
    throw new Error('Game creation is locked')
  }

  const hdrs = await headers()
  const ip =
    hdrs.get('x-forwarded-for')?.split(',')[0].trim() ??
    hdrs.get('x-real-ip') ??
    null

  const { playedAt, notes, players } = parseGameFormData(formData)
  await createGame({ playedAt, notes, submittedFromIp: ip, players })
}
