'use server'

import { redirect } from 'next/navigation'
import { requireAdminSession } from '@/lib/admin-auth'
import { updateGame, deleteGame, gameActionError, parseGameFormData } from '@/lib/games'
import type { GameActionResult } from '@/lib/games'
import { recordAudit } from '@/lib/audit'

export async function updateGameAction(formData: FormData): Promise<GameActionResult> {
  await requireAdminSession()
  const gameId = Number(formData.get('game_id'))
  try {
    const { playedAt, notes, players } = parseGameFormData(formData)
    await updateGame(gameId, { playedAt, notes, players })
    await recordAudit({
      action: 'game.update',
      actorType: 'admin',
      entityType: 'game',
      entityId: gameId,
      summary: `Updated game #${gameId}`,
      metadata: { playerCount: players.length },
    })
  } catch (err) {
    return gameActionError(err)
  }
  // Outside the try block so the NEXT_REDIRECT control-flow error isn't
  // swallowed by the catch above.
  return redirect('/admin/games')
}

export async function deleteGameAction(formData: FormData) {
  await requireAdminSession()
  const gameId = Number(formData.get('game_id'))
  await deleteGame(gameId)
  await recordAudit({
    action: 'game.delete',
    actorType: 'admin',
    entityType: 'game',
    entityId: gameId,
    summary: `Deleted game #${gameId}`,
  })
  redirect('/admin/games')
}
