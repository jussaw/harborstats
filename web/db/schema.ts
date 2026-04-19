import { pgTable, serial, text, timestamp, integer, boolean, inet, check, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  tier: text('tier').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check('players_tier_check', sql`${t.tier} IN ('premium', 'standard')`),
])

export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  playedAt: timestamp('played_at', { withTimezone: true }).notNull(),
  notes: text('notes').notNull().default(''),
  submittedFromIp: inet('submitted_from_ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const gamePlayers = pgTable('game_players', {
  id: serial('id').primaryKey(),
  gameId: integer('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  playerId: integer('player_id').notNull().references(() => players.id),
  score: integer('score').notNull(),
  isWinner: boolean('is_winner').notNull().default(false),
}, (t) => [
  check('game_players_score_check', sql`${t.score} >= 0`),
  index('idx_game_players_game').on(t.gameId),
  index('idx_game_players_player').on(t.playerId),
])
