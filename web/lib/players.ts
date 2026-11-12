import Database from 'better-sqlite3';
import { eq, sql, count } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';
import { players, gamePlayers } from '@/db/schema';
import { parsePlayerTier, type PlayerTier } from '@/lib/player-tier';
import { DuplicatePlayerNameError } from './player-errors';
import { db } from './db';

export { DuplicatePlayerNameError };

type DbPlayer = InferSelectModel<typeof players>;

/**
 * Orders by player name case-insensitively, as Postgres' `en_US` collation did.
 * Applied per query rather than on the column so that name uniqueness stays
 * case-sensitive.
 */
export const playerNameOrder = sql`${players.name} COLLATE NOCASE`;

export type Player = Omit<DbPlayer, 'tier'> & { tier: PlayerTier };

function normalizePlayer(player: DbPlayer): Player {
  return { ...player, tier: parsePlayerTier(player.tier) };
}

export async function getPlayers(): Promise<Player[]> {
  const result = await db
    .select()
    .from(players)
    .orderBy(sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`, playerNameOrder);
  return result.map(normalizePlayer);
}

export async function getPlayerById(id: number): Promise<Player | null> {
  const result = await db.select().from(players).where(eq(players.id, id)).limit(1);
  return result[0] ? normalizePlayer(result[0]) : null;
}

export type PlayerWithUsage = Player & { gameCount: number };

export async function listPlayersWithUsage(): Promise<PlayerWithUsage[]> {
  const result = await db
    .select({
      id: players.id,
      name: players.name,
      tier: players.tier,
      createdAt: players.createdAt,
      gameCount: count(gamePlayers.id),
    })
    .from(players)
    .leftJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
    .groupBy(players.id)
    .orderBy(sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`, playerNameOrder);
  return result.map((player) => ({ ...player, tier: parsePlayerTier(player.tier) }));
}

const SQLITE_UNIQUE_VIOLATION = 'SQLITE_CONSTRAINT_UNIQUE';
// SQLite names the violated columns, not the index: "UNIQUE constraint failed: players.name".
const PLAYERS_NAME_COLUMN = 'players.name';

/**
 * Drizzle's better-sqlite3 query builders throw the raw `SqliteError`; its
 * wrapping paths (`DrizzleError`, `DrizzleQueryError`) carry it as `cause`.
 * Report a duplicate ONLY for a unique violation on `players.name`; every other
 * error is left untranslated.
 */
function isDuplicatePlayerName(error: unknown): boolean {
  const sqliteError =
    error instanceof Error && !(error instanceof Database.SqliteError) ? error.cause : error;
  return (
    sqliteError instanceof Database.SqliteError &&
    sqliteError.code === SQLITE_UNIQUE_VIOLATION &&
    sqliteError.message.includes(PLAYERS_NAME_COLUMN)
  );
}

/**
 * Runs a name-writing mutation, translating a players-name unique violation into
 * a typed `DuplicatePlayerNameError`. Any other failure is rethrown untouched.
 */
async function withDuplicateNameGuard<T>(name: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (isDuplicatePlayerName(error)) throw new DuplicatePlayerNameError(name);
    throw error;
  }
}

export async function createPlayer(name: string, tier: PlayerTier): Promise<number> {
  return withDuplicateNameGuard(name, async () => {
    const [{ id }] = await db.insert(players).values({ name, tier }).returning({ id: players.id });
    return id;
  });
}

export async function renamePlayer(id: number, name: string): Promise<void> {
  await withDuplicateNameGuard(name, async () => {
    await db.update(players).set({ name }).where(eq(players.id, id));
  });
}

export async function updatePlayerTier(id: number, tier: PlayerTier): Promise<void> {
  await db.update(players).set({ tier }).where(eq(players.id, id));
}

/**
 * Applies a name + tier change to an existing player in a single statement, so
 * the mutation and the existence check are atomic. Returns `true` when a row
 * actually matched and was updated, `false` when no player had that id — so
 * callers can tell a real update from a stale/no-op one and avoid recording a
 * success audit for a mutation that never happened.
 */
export async function updatePlayer(id: number, name: string, tier: PlayerTier): Promise<boolean> {
  return withDuplicateNameGuard(name, async () => {
    const updated = await db
      .update(players)
      .set({ name, tier })
      .where(eq(players.id, id))
      .returning({ id: players.id });
    return updated.length > 0;
  });
}

export class PlayerInUseError extends Error {
  constructor(public readonly gameCount: number) {
    super(`Player is referenced in ${gameCount} game(s) and cannot be deleted`);
    this.name = 'PlayerInUseError';
  }
}

/**
 * Deletes a player. Throws `PlayerInUseError` when the player is still
 * referenced by games. Returns `true` when a row actually matched and was
 * removed, `false` when no player had that id — so callers can tell a real
 * deletion from a stale/double delete and avoid recording a success audit for
 * a no-op.
 */
export async function deletePlayer(id: number): Promise<boolean> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(gamePlayers)
    .where(eq(gamePlayers.playerId, id));
  if (total > 0) throw new PlayerInUseError(total);
  const deleted = await db.delete(players).where(eq(players.id, id)).returning({ id: players.id });
  return deleted.length > 0;
}
