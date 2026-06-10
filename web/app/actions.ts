'use server'

import { headers } from 'next/headers'
import { createGame, gameActionError, parseGameFormData } from '@/lib/games'
import type { GameActionResult } from '@/lib/games'
import { isGameSession } from '@/lib/game-auth'
import { getClientIp } from '@/lib/request-ip'

export async function createGameAction(formData: FormData): Promise<GameActionResult> {
  if (!(await isGameSession())) {
    return { ok: false, error: 'Game creation is locked. Unlock it and try again.' }
  }

  const hdrs = await headers()
  const ip = getClientIp(hdrs)

  try {
    const { playedAt, notes, players } = parseGameFormData(formData)
    await createGame({ playedAt, notes, submittedFromIp: ip, players })
  } catch (err) {
    return gameActionError(err)
  }

  return { ok: true }
}
