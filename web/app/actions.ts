'use server'

import { headers } from 'next/headers'
import { createGame, parseGameFormData } from '@/lib/games'
import { isGameSession } from '@/lib/game-auth'
import { getClientIp } from '@/lib/request-ip'

export async function createGameAction(formData: FormData) {
  if (!(await isGameSession())) {
    throw new Error('Game creation is locked')
  }

  const hdrs = await headers()
  const ip = getClientIp(hdrs)

  const { playedAt, notes, players } = parseGameFormData(formData)
  await createGame({ playedAt, notes, submittedFromIp: ip, players })
}
