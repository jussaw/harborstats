import { and, type Column, inArray, notInArray, type SQL, sql } from 'drizzle-orm';
import { gamePlayers, games } from '@/db/schema';
import { db } from './db';

/**
 * Cohort filter for the stats page. When a subset of players is selected, every stat is
 * recomputed as if only "eligible games" existed — games whose entire roster is within the
 * selected set. A `null` filter means "all players selected", i.e. no filtering at all, which
 * keeps the default page render byte-for-byte identical to the unfiltered behavior.
 *
 * - `selectedPlayerIds` bounds the player universe so functions that seed their output from the
 *   full `players` table do not leak non-selected players (with zeroed stats) into the view.
 * - `eligibleGameIds` bounds the participant/game rows every stat aggregates over.
 */
export type StatsFilter = {
  selectedPlayerIds: number[];
  eligibleGameIds: number[];
} | null;

function idList(ids: number[]): SQL {
  // inArray already collapses an empty list to `false`; keep the intent explicit for readers.
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}

/** Condition for a query-builder `.where()` / join clause on a game-id column. */
export function gameIdCondition(filter: StatsFilter, gameIdColumn: Column): SQL | undefined {
  return filter ? inArray(gameIdColumn, filter.eligibleGameIds) : undefined;
}

/** Condition for a query-builder `.where()` on a player-id column. */
export function playerIdCondition(filter: StatsFilter, playerIdColumn: Column): SQL | undefined {
  return filter ? inArray(playerIdColumn, filter.selectedPlayerIds) : undefined;
}

/** Combined `.where()` helper for queries that touch both games and players. */
export function statsRowFilter(
  filter: StatsFilter,
  columns: { gameId?: Column; playerId?: Column },
): SQL | undefined {
  if (!filter) return undefined;
  const conditions: SQL[] = [];
  if (columns.gameId) conditions.push(inArray(columns.gameId, filter.eligibleGameIds));
  if (columns.playerId) conditions.push(inArray(columns.playerId, filter.selectedPlayerIds));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Raw-SQL fragment for `db.execute` CTEs, anchored on the `gp.game_id` alias. Meant to be appended
 * after a `WHERE true` so the leading ` AND` composes cleanly; empty when there is no filter.
 */
export function gameIdSqlCondition(filter: StatsFilter): SQL {
  if (!filter) return sql``;
  if (filter.eligibleGameIds.length === 0) return sql` AND false`;
  return sql` AND gp.game_id IN (${idList(filter.eligibleGameIds)})`;
}

/** Raw-SQL fragment anchored on the `p.id` alias, mirroring {@link gameIdSqlCondition}. */
export function playerIdSqlCondition(filter: StatsFilter): SQL {
  if (!filter) return sql``;
  if (filter.selectedPlayerIds.length === 0) return sql` AND false`;
  return sql` AND p.id IN (${idList(filter.selectedPlayerIds)})`;
}

function sameIdSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((id) => setB.has(id));
}

/**
 * Resolves the concrete cohort filter for a selection.
 *
 * - selection == all players -> `null` (no filtering).
 * - selection empty -> empty eligible set (everything renders empty).
 * - otherwise -> the ids of games whose entire roster is within the selected set.
 */
export async function resolveStatsFilter(
  selectedPlayerIds: number[],
  allPlayerIds: number[],
): Promise<StatsFilter> {
  if (sameIdSet(selectedPlayerIds, allPlayerIds)) {
    return null;
  }

  if (selectedPlayerIds.length === 0) {
    return { selectedPlayerIds: [], eligibleGameIds: [] };
  }

  const rows = await db
    .select({ id: games.id })
    .from(games)
    .where(
      sql`NOT EXISTS (
        SELECT 1 FROM ${gamePlayers}
        WHERE ${gamePlayers.gameId} = ${games.id}
          AND ${notInArray(gamePlayers.playerId, selectedPlayerIds)}
      )`,
    );

  return { selectedPlayerIds, eligibleGameIds: rows.map((row) => row.id) };
}
