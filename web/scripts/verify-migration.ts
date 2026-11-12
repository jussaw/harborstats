/**
 * One-off: prove a converted SQLite file holds exactly what Postgres holds.
 *
 *   tsx scripts/verify-migration.ts --pg <postgres-url> --sqlite <path.db>
 *
 * Exits 0 only if every check passes; otherwise prints each difference as
 * `table id column: pg=<…> sqlite=<…>` and exits 1. Opens the SQLite file
 * read-only, so the file it passes is the file that gets deployed.
 *
 * Written independently of scripts/pg-to-sqlite.ts (it imports nothing from
 * it): columns and their types come from Postgres's information_schema, values
 * are read with this file's own expressions, and SQLite storage classes are
 * checked with typeof(), so a converter mapping bug cannot hide behind a
 * shared one.
 *
 * Removed after the switchover settles (plan Phase 5).
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, rmSync, statSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { isDeepStrictEqual, parseArgs } from 'node:util'
import Database from 'better-sqlite3'
import postgres from 'postgres'
import { runMigrations } from '../lib/migrate'

const TABLES = ['players', 'games', 'game_players', 'app_settings', 'audit_logs'] as const

// Sequence names as Postgres `serial` creates them.
const SEQUENCES: Record<string, string> = {
  players: 'players_id_seq',
  games: 'games_id_seq',
  game_players: 'game_players_id_seq',
  audit_logs: 'audit_logs_id_seq',
}

const EXPECTED_INDEXES = [
  { name: 'idx_game_players_game', unique: false, partial: false },
  { name: 'idx_game_players_player', unique: false, partial: false },
  { name: 'game_players_game_id_player_id_unique', unique: true, partial: false },
  { name: 'game_players_one_winner_per_game', unique: true, partial: true },
  { name: 'idx_audit_logs_created_at', unique: false, partial: false },
  { name: 'idx_audit_logs_action', unique: false, partial: false },
]

const STORED_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/

export interface SqliteCell {
  value: unknown
  // SQLite's typeof(): the storage class actually written.
  type: string
}

function parseJson(text: unknown): { ok: true; value: unknown } | { ok: false } {
  if (typeof text !== 'string') return { ok: false }
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false }
  }
}

/**
 * Whether one SQLite cell holds the same value as the Postgres cell of the
 * given information_schema data_type. Postgres values arrive as this file
 * selects them: timestamps as UTC microsecond text, inet as host text, jsonb
 * as text.
 */
export function cellsMatch(pgType: string, pgValue: unknown, sqlite: SqliteCell): boolean {
  if (pgValue === null) return sqlite.type === 'null'
  if (sqlite.type === 'null') return false

  switch (pgType) {
    case 'integer':
      return sqlite.type === 'integer' && sqlite.value === pgValue
    case 'boolean':
      return sqlite.type === 'integer' && sqlite.value === (pgValue === true ? 1 : 0)
    case 'text':
    case 'inet':
      return sqlite.type === 'text' && sqlite.value === pgValue
    case 'timestamp with time zone':
      return (
        sqlite.type === 'text' &&
        STORED_TIMESTAMP.test(String(sqlite.value)) &&
        sqlite.value === pgValue
      )
    case 'jsonb': {
      if (sqlite.type !== 'text') return false
      const pgJson = parseJson(pgValue)
      const sqliteJson = parseJson(sqlite.value)
      return pgJson.ok && sqliteJson.ok && isDeepStrictEqual(pgJson.value, sqliteJson.value)
    }
    default:
      throw new Error(`No comparison defined for Postgres type ${pgType}`)
  }
}

function pgSelectExpression(column: string, type: string): string {
  const c = `"${column}"`
  switch (type) {
    case 'timestamp with time zone':
      return `to_char(timezone('UTC', ${c}), 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`
    case 'inet':
      // host() drops a netmask; show the full value if there was one to lose.
      return `case when masklen(${c}) = (case family(${c}) when 4 then 32 else 128 end) then host(${c}) else ${c}::text end`
    case 'jsonb':
      return `${c}::text`
    default:
      return c
  }
}

function show(value: unknown): string {
  return value === undefined ? '<missing>' : JSON.stringify(value)
}

type Sql = ReturnType<typeof postgres>
type Row = Record<string, unknown>

class Report {
  readonly differences: string[] = []

  readonly passed: string[] = []

  diff(table: string, id: unknown, column: string, pg: unknown, sqlite: unknown): void {
    this.differences.push(`${table} ${String(id)} ${column}: pg=${show(pg)} sqlite=${show(sqlite)}`)
  }

  problem(message: string): void {
    this.differences.push(message)
  }

  ok(message: string): void {
    this.passed.push(message)
  }
}

async function compareTable(pg: Sql, sqlite: Database.Database, table: string, report: Report) {
  const pgColumns = (await pg`
    select column_name, data_type from information_schema.columns
    where table_schema = 'public' and table_name = ${table}
    order by ordinal_position`) as unknown as { column_name: string; data_type: string }[]
  const sqliteColumns = (sqlite.pragma(`table_info("${table}")`) as { name: string }[]).map(
    (c) => c.name,
  )

  if (pgColumns.length === 0) report.problem(`${table} - table: pg=<missing>`)
  pgColumns
    .filter((c) => !sqliteColumns.includes(c.column_name))
    .forEach((c) => report.diff(table, '-', c.column_name, '<column>', undefined))
  sqliteColumns
    .filter((name) => !pgColumns.some((c) => c.column_name === name))
    .forEach((name) => report.diff(table, '-', name, undefined, '<column>'))

  const columns = pgColumns.filter((c) => sqliteColumns.includes(c.column_name))
  const pgRows = (await pg.unsafe(
    `select ${columns.map((c) => `${pgSelectExpression(c.column_name, c.data_type)} as "${c.column_name}"`).join(', ')}
     from "${table}" order by id`,
  )) as unknown as Row[]
  const sqliteRows = sqlite
    .prepare(
      `select ${columns.map((c) => `"${c.column_name}" as "v:${c.column_name}", typeof("${c.column_name}") as "t:${c.column_name}"`).join(', ')}
       from "${table}" order by id`,
    )
    .all() as Row[]

  if (pgRows.length !== sqliteRows.length) {
    report.diff(table, '-', 'rows', pgRows.length, sqliteRows.length)
  }

  const sqliteById = new Map(sqliteRows.map((r) => [r['v:id'], r]))
  const pgIds = new Set(pgRows.map((r) => r.id))
  let cells = 0
  pgRows.forEach((pgRow) => {
    const sqliteRow = sqliteById.get(pgRow.id)
    if (!sqliteRow) {
      report.diff(table, pgRow.id, 'row', '<present>', undefined)
      return
    }
    columns.forEach(({ column_name: name, data_type: type }) => {
      cells += 1
      const cell = { value: sqliteRow[`v:${name}`], type: String(sqliteRow[`t:${name}`]) }
      if (!cellsMatch(type, pgRow[name], cell)) {
        report.diff(table, pgRow.id, name, pgRow[name], cell.value)
      }
    })
  })
  sqliteRows
    .filter((r) => !pgIds.has(r['v:id']))
    .forEach((r) => report.diff(table, r['v:id'], 'row', undefined, '<present>'))

  report.ok(`${table}: ${pgRows.length} rows × ${columns.length} columns (${cells} values)`)
}

async function compareSequences(pg: Sql, sqlite: Database.Database, report: Report) {
  const sqliteRows = sqlite
    .prepare('select name, seq, typeof(seq) as type from sqlite_sequence')
    .all() as { name: string; seq: unknown; type: string }[]

  await Promise.all(
    Object.entries(SEQUENCES).map(async ([table, sequence]) => {
      const [pgRow] = await pg`
        select last_value::text as last_value from pg_sequences
        where schemaname = 'public' and sequencename = ${sequence}`
      if (!pgRow) {
        report.problem(`sqlite_sequence ${table} seq: pg=<no sequence ${sequence}>`)
        return
      }
      const pgValue = pgRow.last_value === null ? null : Number(pgRow.last_value)
      const matching = sqliteRows.filter((r) => r.name === table)
      if (matching.length > 1) {
        report.problem(`sqlite_sequence ${table} seq: sqlite has ${matching.length} rows for one table`)
      }
      const cell = matching[0]
        ? { value: matching[0].seq, type: matching[0].type }
        : { value: null, type: 'null' }
      if (!cellsMatch('integer', pgValue, cell)) {
        report.diff('sqlite_sequence', table, 'seq', pgValue, matching[0]?.seq)
      }
    }),
  )
  sqliteRows
    .filter((r) => !(r.name in SEQUENCES))
    .forEach((r) => report.diff('sqlite_sequence', r.name, 'seq', undefined, r.seq))

  report.ok(`sqlite_sequence: ${Object.keys(SEQUENCES).length} sequences compared`)
}

function checkSqliteIntegrity(sqlite: Database.Database, report: Report) {
  const integrity = sqlite.pragma('integrity_check') as { integrity_check: string }[]
  if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') {
    report.problem(`integrity_check: ${JSON.stringify(integrity)}`)
  } else {
    report.ok('integrity_check: ok')
  }

  const violations = sqlite.pragma('foreign_key_check') as unknown[]
  if (violations.length > 0) {
    report.problem(`foreign_key_check: ${violations.length} violation(s) ${JSON.stringify(violations)}`)
  } else {
    report.ok('foreign_key_check: none')
  }
}

function checkSqliteIndexes(sqlite: Database.Database, report: Report) {
  const indexes = TABLES.flatMap(
    (table) =>
      sqlite.pragma(`index_list("${table}")`) as { name: string; unique: number; partial: number }[],
  )
  EXPECTED_INDEXES.forEach((expected) => {
    const found = indexes.find((i) => i.name === expected.name)
    if (!found) {
      report.problem(`index ${expected.name}: missing`)
    } else if (Boolean(found.unique) !== expected.unique || Boolean(found.partial) !== expected.partial) {
      report.problem(
        `index ${expected.name}: unique=${found.unique} partial=${found.partial}, expected unique=${Number(expected.unique)} partial=${Number(expected.partial)}`,
      )
    }
  })

  const playerIndexes = sqlite.pragma('index_list("players")') as { name: string; unique: number }[]
  const uniqueOnName = playerIndexes.some(
    (i) =>
      i.unique === 1 &&
      isDeepStrictEqual(
        (sqlite.pragma(`index_info("${i.name}")`) as { name: string }[]).map((c) => c.name),
        ['name'],
      ),
  )
  if (!uniqueOnName) report.problem('index on players(name): no unique index')

  report.ok(`indexes: ${EXPECTED_INDEXES.length} named + unique players(name) checked`)
}

// The file's schema and recorded migrations must be exactly what the repo's
// migrations produce, so startup applies nothing and every CHECK, foreign key
// and AUTOINCREMENT is in place.
function checkSqliteSchema(sqlite: Database.Database, report: Report) {
  const fresh = new Database(':memory:')
  try {
    runMigrations(fresh, fileURLToPath(new URL('../db/migrations/', import.meta.url)))
    const schemaQuery = `select type, name, tbl_name, sql from sqlite_master
      where name not like 'sqlite_%' order by type, name`
    const migrationsQuery = 'select hash, created_at from __drizzle_migrations order by id'

    const expected = fresh.prepare(schemaQuery).all() as Row[]
    const actual = sqlite.prepare(schemaQuery).all() as Row[]
    if (!isDeepStrictEqual(expected, actual)) {
      const names = (rows: Row[]) => rows.map((r) => `${r.type}:${r.name}`)
      report.problem(
        `schema: differs from a fresh migration (expected ${JSON.stringify(names(expected))}, got ${JSON.stringify(names(actual))})`,
      )
    }

    const expectedMigrations = fresh.prepare(migrationsQuery).all()
    const actualMigrations = sqlite.prepare(migrationsQuery).all()
    if (!isDeepStrictEqual(expectedMigrations, actualMigrations)) {
      report.problem(
        `__drizzle_migrations: expected ${JSON.stringify(expectedMigrations)}, got ${JSON.stringify(actualMigrations)}`,
      )
    }

    report.ok(
      `schema: ${expected.length} objects and ${expectedMigrations.length} recorded migration(s) match a fresh migration`,
    )
  } finally {
    fresh.close()
  }
}

/**
 * Only the .db file is deployed. A non-empty -wal beside it holds data the
 * verifier's connection would read and pass but the deployed file lacks, so
 * refuse it instead of verifying something other than what ships.
 */
export function assertNoPendingWal(path: string): void {
  const wal = `${path}-wal`
  if (existsSync(wal) && statSync(wal).size > 0) {
    throw new Error(
      `${wal} holds data that is not in ${path} yet; only the .db is deployed. Close every connection to it (which checkpoints the WAL) and verify again.`,
    )
  }
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { pg: { type: 'string' }, sqlite: { type: 'string' } },
    strict: true,
  })
  const { pg: pgUrl, sqlite: sqlitePath } = values
  if (!pgUrl || !sqlitePath) {
    throw new Error('Usage: tsx scripts/verify-migration.ts --pg <postgres-url> --sqlite <path.db>')
  }

  assertNoPendingWal(sqlitePath)
  const before = sha256(sqlitePath)
  // A read-only connection to a WAL database creates -wal/-shm and cannot
  // remove them; remove the ones this run created (an empty -wal only).
  const companions = ['-wal', '-shm'].map((suffix) => `${sqlitePath}${suffix}`)
  const createdHere = companions.filter((path) => !existsSync(path))
  const report = new Report()
  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true })
  const pg = postgres(pgUrl, { max: 1, onnotice: () => {} })
  try {
    await TABLES.reduce(
      (previous, table) => previous.then(() => compareTable(pg, sqlite, table, report)),
      Promise.resolve(),
    )
    await compareSequences(pg, sqlite, report)
    checkSqliteIntegrity(sqlite, report)
    checkSqliteIndexes(sqlite, report)
    checkSqliteSchema(sqlite, report)
  } finally {
    sqlite.close()
    await pg.end()
  }

  createdHere
    .filter((path) => existsSync(path) && (!path.endsWith('-wal') || statSync(path).size === 0))
    .forEach((path) => rmSync(path))

  const after = sha256(sqlitePath)
  if (after !== before) report.problem(`sha256 changed while verifying: ${before} → ${after}`)

  report.passed.forEach((line) => console.log(`checked ${line}`))
  console.log(`sha256 ${after}  ${sqlitePath}`)
  if (report.differences.length > 0) {
    report.differences.forEach((line) => console.log(line))
    console.log(`FAILED: ${report.differences.length} difference(s)`)
    process.exitCode = 1
  } else {
    console.log('OK: 0 differences')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
