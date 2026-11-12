import { db } from '@/lib/db'
import { gamePlayers, games, players } from '@/db/schema'
import { PlayerTier } from '@/lib/player-tier'
import { assertIsTestDatabase } from './test-env'

export const DEFAULT_PLAYED_AT = new Date('2026-01-01T12:00:00.000Z')

let playerCounter = 1

export async function resetDatabase(): Promise<void> {
  assertIsTestDatabase(db.$client.name)
  playerCounter = 1
  // Equivalent of TRUNCATE … RESTART IDENTITY: delete in FK order, then reset
  // the AUTOINCREMENT counters.
  db.$client.exec(`
    DELETE FROM audit_logs;
    DELETE FROM app_settings;
    DELETE FROM game_players;
    DELETE FROM games;
    DELETE FROM players;
    DELETE FROM sqlite_sequence;
  `)
}

export async function createTestPlayer(input?: {
  name?: string
  tier?: PlayerTier
}) {
  const nextPlayerNumber = playerCounter
  playerCounter += 1
  const [player] = await db
    .insert(players)
    .values({
      name: input?.name ?? `Player ${nextPlayerNumber}`,
      tier: input?.tier ?? PlayerTier.Standard,
    })
    .returning()

  return player
}

export async function createTestGame(input: {
  playedAt?: Date
  notes?: string
  submittedFromIp?: string | null
  players: { playerId: number; score: number; isWinner: boolean }[]
}) {
  const [game] = await db
    .insert(games)
    .values({
      playedAt: input.playedAt ?? DEFAULT_PLAYED_AT,
      notes: input.notes ?? '',
      submittedFromIp: input.submittedFromIp ?? null,
    })
    .returning()

  if (input.players.length > 0) {
    await db.insert(gamePlayers).values(
      input.players.map((player) => ({
        gameId: game.id,
        playerId: player.playerId,
        score: player.score,
        isWinner: player.isWinner,
      })),
    )
  }

  return game
}
