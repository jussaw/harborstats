'use server'

import { headers } from 'next/headers'
import { createGame, gameActionError, parseGameFormData } from '@/lib/games'
import type { GameActionResult } from '@/lib/games'
import { isGameSession } from '@/lib/game-auth'
import { getClientIp } from '@/lib/request-ip'
import { recordAudit } from '@/lib/audit'

export async function createGameAction(formData: FormData): Promise<GameActionResult> {
  if (!(await isGameSession())) {
    return { ok: false, error: 'Game creation is locked. Unlock it and try again.' }
  }

  const hdrs = await headers()
  const ip = getClientIp(hdrs)

  let gameId: number
  try {
    const { playedAt, notes, players } = parseGameFormData(formData)
    gameId = await createGame({ playedAt, notes, submittedFromIp: ip, players })
    await recordAudit({
      action: 'game.create',
      actorType: 'game',
      entityType: 'game',
      entityId: gameId,
      summary: `Recorded a game with ${players.length} player${players.length === 1 ? '' : 's'}`,
      metadata: { playerCount: players.length },
    })
  } catch (err) {
    return gameActionError(err)
  }

  return { ok: true }
}
