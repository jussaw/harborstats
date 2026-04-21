import { PlayerTier } from '@/lib/player-tier'
import { createTestGame, createTestPlayer, resetDatabase } from '../helpers/db'
import { applyTestEnv } from '../helpers/test-env'

applyTestEnv()

export async function resetE2eDatabase(): Promise<void> {
  await resetDatabase()
}

export async function createE2ePlayer(input?: {
  name?: string
  tier?: PlayerTier
}) {
  return createTestPlayer(input)
}

export async function createE2eGame(input: {
  playedAt?: Date
  notes?: string
  submittedFromIp?: string | null
  players: { playerId: number; score: number; isWinner: boolean }[]
}) {
  return createTestGame(input)
}
