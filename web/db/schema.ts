import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  inet,
  jsonb,
  check,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const players = pgTable(
  'players',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull().unique(),
    tier: text('tier').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('players_tier_check', sql`${t.tier} IN ('premium', 'standard')`)],
);

export const games = pgTable('games', {
  id: serial('id').primaryKey(),
  playedAt: timestamp('played_at', { withTimezone: true }).notNull(),
  notes: text('notes').notNull().default(''),
  submittedFromIp: inet('submitted_from_ip'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const gamePlayers = pgTable(
  'game_players',
  {
    id: serial('id').primaryKey(),
    gameId: integer('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    playerId: integer('player_id')
      .notNull()
      .references(() => players.id),
    score: integer('score').notNull(),
    isWinner: boolean('is_winner').notNull().default(false),
  },
  (t) => [
    // Upper bound mirrors MAX_SCORE in lib/games.ts — change both together.
    check('game_players_score_check', sql`${t.score} >= 0 AND ${t.score} <= 30`),
    index('idx_game_players_game').on(t.gameId),
    index('idx_game_players_player').on(t.playerId),
    uniqueIndex('game_players_game_id_player_id_unique').on(t.gameId, t.playerId),
    uniqueIndex('game_players_one_winner_per_game')
      .on(t.gameId)
      .where(sql`${t.isWinner} = true`),
  ],
);

export const appSettings = pgTable('app_settings', {
  id: integer('id').primaryKey().default(1),
  winRateMinGames: integer('win_rate_min_games').notNull().default(0),
  podiumRateMinGames: integer('podium_rate_min_games').notNull().default(0),
  statCardMinGames: integer('stat_card_min_games').notNull().default(5),
  newGamePasswordHash: text('new_game_password_hash'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: serial('id').primaryKey(),
    // '<entity>.<verb>', e.g. 'player.create'. Intentionally unconstrained so
    // new action types can be added freely as features land (see Audit
    // Requirements in web/AGENTS.md).
    action: text('action').notNull(),
    actorType: text('actor_type').notNull(),
    // Nullable: null when the client IP can't be resolved (e.g. local dev).
    actorIp: inet('actor_ip'),
    entityType: text('entity_type'),
    // Text so non-numeric or composite ids can be stored uniformly.
    entityId: text('entity_id'),
    summary: text('summary').notNull(),
    // Structured detail (changed fields). Never store secrets here.
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('audit_logs_actor_type_check', sql`${t.actorType} IN ('admin', 'game', 'anonymous')`),
    index('idx_audit_logs_created_at').on(t.createdAt),
    index('idx_audit_logs_action').on(t.action),
  ],
);
