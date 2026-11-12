import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
// Relative import: drizzle-kit loads this file and does not resolve the `@/` alias.
import { nowTimestampSql, timestampText } from './columns';

// IDs use AUTOINCREMENT so a deleted id is never handed out again (audit
// entries reference ids as text).

export const players = sqliteTable(
  'players',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique(),
    tier: text('tier').notNull(),
    createdAt: timestampText('created_at').notNull().default(nowTimestampSql),
  },
  (t) => [check('players_tier_check', sql`${t.tier} IN ('premium', 'standard')`)],
);

export const games = sqliteTable('games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  playedAt: timestampText('played_at').notNull(),
  notes: text('notes').notNull().default(''),
  submittedFromIp: text('submitted_from_ip'),
  createdAt: timestampText('created_at').notNull().default(nowTimestampSql),
});

export const gamePlayers = sqliteTable(
  'game_players',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    playerId: integer('player_id')
      .notNull()
      .references(() => players.id),
    score: integer('score').notNull(),
    isWinner: integer('is_winner', { mode: 'boolean' }).notNull().default(false),
  },
  (t) => [
    // Upper bound mirrors MAX_SCORE in lib/games.ts — change both together.
    check('game_players_score_check', sql`${t.score} >= 0 AND ${t.score} <= 30`),
    index('idx_game_players_game').on(t.gameId),
    index('idx_game_players_player').on(t.playerId),
    uniqueIndex('game_players_game_id_player_id_unique').on(t.gameId, t.playerId),
    uniqueIndex('game_players_one_winner_per_game')
      .on(t.gameId)
      .where(sql`${t.isWinner} = 1`),
  ],
);

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  winRateMinGames: integer('win_rate_min_games').notNull().default(0),
  podiumRateMinGames: integer('podium_rate_min_games').notNull().default(0),
  statCardMinGames: integer('stat_card_min_games').notNull().default(5),
  newGamePasswordHash: text('new_game_password_hash'),
  updatedAt: timestampText('updated_at').notNull().default(nowTimestampSql),
});

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    // '<entity>.<verb>', e.g. 'player.create'. Intentionally unconstrained so
    // new action types can be added freely as features land (see Audit
    // Requirements in web/AGENTS.md).
    action: text('action').notNull(),
    actorType: text('actor_type').notNull(),
    // Nullable: null when the client IP can't be resolved (e.g. local dev).
    // Stored as text in the form Postgres inet printed (compressed lowercase IPv6).
    actorIp: text('actor_ip'),
    entityType: text('entity_type'),
    // Text so non-numeric or composite ids can be stored uniformly.
    entityId: text('entity_id'),
    summary: text('summary').notNull(),
    // Structured detail (changed fields), stored as JSON text. Never store secrets here.
    metadata: text('metadata', { mode: 'json' }),
    createdAt: timestampText('created_at').notNull().default(nowTimestampSql),
  },
  (t) => [
    check('audit_logs_actor_type_check', sql`${t.actorType} IN ('admin', 'game', 'anonymous')`),
    index('idx_audit_logs_created_at').on(t.createdAt),
    index('idx_audit_logs_action').on(t.action),
  ],
);
