/**
 * One-off: copy a HarborStats Postgres database into a new SQLite file.
 *
 *   tsx scripts/pg-to-sqlite.ts --pg <postgres-url> --out <path.db>
 *
 * Creates the file with the real migrations, copies all five tables with their
 * ids in one transaction, and carries each Postgres sequence over to
 * sqlite_sequence so a deleted id is never handed out again. Refuses to write
 * over an existing file. Check the result with scripts/verify-migration.ts,
 * which deliberately shares no code with this file.
 *
 * Removed after the pi4 switchover settles (plan Phase 5).
 */
import { existsSync, rmSync, statSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import postgres from 'postgres'
import { runMigrations } from '../lib/migrate'
import { openDatabase } from '../lib/sqlite'

const STORED_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/

/**
 * Checks one timestamp selected with `to_char(col AT TIME ZONE 'UTC',
 * 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')` already has the stored form
 * `YYYY-MM-DDTHH:MM:SS.ffffffZ` (27 chars) and returns it unchanged. Anything
 * else means the select is wrong, so it throws rather than guess.
 */
export function pgTimestampToText(value: string): string {
  if (!STORED_TIMESTAMP.test(value)) {
    throw new Error(`Expected a UTC timestamp like 2026-01-01T00:00:00.000000Z, got ${JSON.stringify(value)}`)
  }
  return value
}

function pgBooleanToInteger(value: unknown): 0 | 1 {
  if (typeof value !== 'boolean') {
    throw new Error(`Expected a boolean, got ${JSON.stringify(value)}`)
  }
  return value ? 1 : 0
}

// The four tables whose ids come from a sequence (serial → AUTOINCREMENT).
const SEQUENCE_TABLES = ['players', 'games', 'game_players', 'audit_logs'] as const

type Sql = ReturnType<typeof postgres>
type Row = Record<string, unknown>

export interface SourceData {
  players: Row[]
  games: Row[]
  gamePlayers: Row[]
  appSettings: Row[]
  auditLogs: Row[]
  sequences: Map<string, number | null>
}

async function readPostgres(pg: Sql): Promise<SourceData> {
  // Timestamps as text at full microsecond precision; inet as host text
  // (compressed lowercase IPv6); jsonb as its text form, stored as-is.
  const players = await pg`
    select id, name, tier,
      to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at
    from players order by id`
  const games = await pg`
    select id,
      to_char(played_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as played_at,
      notes, host(submitted_from_ip) as submitted_from_ip,
      to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at
    from games order by id`
  const gamePlayers = await pg`
    select id, game_id, player_id, score, is_winner from game_players order by id`
  const appSettings = await pg`
    select id, win_rate_min_games, podium_rate_min_games, stat_card_min_games,
      new_game_password_hash,
      to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at
    from app_settings order by id`
  const auditLogs = await pg`
    select id, action, actor_type, host(actor_ip) as actor_ip, entity_type, entity_id, summary,
      metadata::text as metadata,
      to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at
    from audit_logs order by id`

  const lastValues = await Promise.all(
    SEQUENCE_TABLES.map(async (table) => {
      const [row] = await pg`
        select s.last_value::text as last_value
        from pg_sequences s
        where format('%I.%I', s.schemaname, s.sequencename) = pg_get_serial_sequence(${table}, 'id')`
      if (!row) throw new Error(`No sequence found for ${table}.id`)
      // last_value is null for a sequence that was never used.
      return [table, row.last_value === null ? null : Number(row.last_value)] as const
    }),
  )

  return {
    players,
    games,
    gamePlayers,
    appSettings,
    auditLogs,
    sequences: new Map(lastValues),
  }
}

export function writeSqlite(out: string, data: SourceData): Record<string, number> {
  const sqlite = openDatabase(out)
  try {
    runMigrations(sqlite)

    const insertPlayer = sqlite.prepare(
      'insert into players (id, name, tier, created_at) values (?, ?, ?, ?)',
    )
    const insertGame = sqlite.prepare(
      'insert into games (id, played_at, notes, submitted_from_ip, created_at) values (?, ?, ?, ?, ?)',
    )
    const insertGamePlayer = sqlite.prepare(
      'insert into game_players (id, game_id, player_id, score, is_winner) values (?, ?, ?, ?, ?)',
    )
    const insertAppSettings = sqlite.prepare(
      `insert into app_settings
        (id, win_rate_min_games, podium_rate_min_games, stat_card_min_games, new_game_password_hash, updated_at)
        values (?, ?, ?, ?, ?, ?)`,
    )
    const insertAuditLog = sqlite.prepare(
      `insert into audit_logs
        (id, action, actor_type, actor_ip, entity_type, entity_id, summary, metadata, created_at)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    // sqlite_sequence has no key on name (an upsert would add a second row), and
    // its seq column has no type, so a bound JS number would be stored as REAL.
    const clearSequence = sqlite.prepare('delete from sqlite_sequence where name = ?')
    const insertSequence = sqlite.prepare(
      'insert into sqlite_sequence (name, seq) values (?, cast(? as integer))',
    )

    // FK order, so foreign keys stay on for every insert.
    sqlite.transaction(() => {
      data.players.forEach((r) => {
        insertPlayer.run(r.id, r.name, r.tier, pgTimestampToText(r.created_at as string))
      })
      data.games.forEach((r) => {
        insertGame.run(
          r.id,
          pgTimestampToText(r.played_at as string),
          r.notes,
          r.submitted_from_ip,
          pgTimestampToText(r.created_at as string),
        )
      })
      data.gamePlayers.forEach((r) => {
        insertGamePlayer.run(r.id, r.game_id, r.player_id, r.score, pgBooleanToInteger(r.is_winner))
      })
      data.appSettings.forEach((r) => {
        insertAppSettings.run(
          r.id,
          r.win_rate_min_games,
          r.podium_rate_min_games,
          r.stat_card_min_games,
          r.new_game_password_hash,
          pgTimestampToText(r.updated_at as string),
        )
      })
      data.auditLogs.forEach((r) => {
        insertAuditLog.run(
          r.id,
          r.action,
          r.actor_type,
          r.actor_ip,
          r.entity_type,
          r.entity_id,
          r.summary,
          r.metadata,
          pgTimestampToText(r.created_at as string),
        )
      })
      // The explicit-id inserts already moved each seq to max(id); a sequence
      // can be ahead of that (deleted rows), and the next id must follow it.
      data.sequences.forEach((lastValue, table) => {
        clearSequence.run(table)
        if (lastValue !== null) insertSequence.run(table, lastValue)
      })
    })()

    const violations = sqlite.pragma('foreign_key_check') as unknown[]
    if (violations.length > 0) {
      throw new Error(`Copied data has ${violations.length} foreign key violation(s)`)
    }

    // Fold the WAL back into the main file so the .db alone is the database.
    sqlite.pragma('wal_checkpoint(TRUNCATE)')

    return {
      players: data.players.length,
      games: data.games.length,
      game_players: data.gamePlayers.length,
      app_settings: data.appSettings.length,
      audit_logs: data.auditLogs.length,
    }
  } finally {
    sqlite.close()
  }
}

const DATABASE_FILE_SUFFIXES = ['', '-wal', '-shm']

function removeDatabaseFiles(path: string): void {
  DATABASE_FILE_SUFFIXES.forEach((suffix) => rmSync(`${path}${suffix}`, { force: true }))
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { pg: { type: 'string' }, out: { type: 'string' } },
    strict: true,
  })
  const { pg: pgUrl, out } = values
  if (!pgUrl || !out) {
    throw new Error('Usage: tsx scripts/pg-to-sqlite.ts --pg <postgres-url> --out <path.db>')
  }
  const existing = DATABASE_FILE_SUFFIXES.map((suffix) => `${out}${suffix}`).find((path) =>
    existsSync(path),
  )
  if (existing) throw new Error(`Refusing to write over existing ${existing}`)

  const pg = postgres(pgUrl, { max: 1, onnotice: () => {} })
  let data: SourceData
  try {
    data = await readPostgres(pg)
  } finally {
    await pg.end()
  }

  let counts: Record<string, number>
  try {
    counts = writeSqlite(out, data)
  } catch (error) {
    // Only files this run created: the existence check above refused any other.
    removeDatabaseFiles(out)
    throw error
  }
  if (existsSync(`${out}-wal`) && statSync(`${out}-wal`).size > 0) {
    throw new Error(`${out}-wal was left behind; the .db alone is not the full database`)
  }

  Object.entries(counts).forEach(([table, count]) => console.log(`${table}: ${count}`))
  data.sequences.forEach((lastValue, table) => {
    console.log(`sequence ${table}: ${lastValue ?? 'never used'}`)
  })
  console.log(`Wrote ${out}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
