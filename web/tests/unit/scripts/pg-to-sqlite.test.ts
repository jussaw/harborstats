import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { pgTimestampToText, writeSqlite, type SourceData } from '@/scripts/pg-to-sqlite'

describe('pgTimestampToText', () => {
  it('returns a microsecond UTC timestamp unchanged', () => {
    expect(pgTimestampToText('2026-11-12T04:34:59.485225Z')).toBe('2026-11-12T04:34:59.485225Z')
  })

  it('keeps trailing zero microseconds', () => {
    expect(pgTimestampToText('2026-01-01T00:00:00.000000Z')).toBe('2026-01-01T00:00:00.000000Z')
  })

  it('rejects a millisecond-only fraction', () => {
    expect(() => pgTimestampToText('2026-11-12T04:34:59.485Z')).toThrow(/2026-11-12T04:34:59.485Z/)
  })

  it('rejects a value with a UTC offset instead of Z', () => {
    expect(() => pgTimestampToText('2026-11-12 04:34:59.485225+00')).toThrow()
  })
})

// Rows shaped like the converter's Postgres selects return them.
function sourceData(overrides: Partial<SourceData> = {}): SourceData {
  return {
    players: [
      { id: 3, name: 'Ana', tier: 'premium', created_at: '2026-01-01T00:00:00.123456Z' },
      { id: 7, name: 'Bo', tier: 'standard', created_at: '2026-01-02T00:00:00.000000Z' },
    ],
    games: [
      {
        id: 10,
        played_at: '2026-02-01T23:15:00.000000Z',
        notes: '',
        submitted_from_ip: '2001:db8::1',
        created_at: '2026-02-01T23:16:01.654321Z',
      },
    ],
    gamePlayers: [
      { id: 20, game_id: 10, player_id: 3, score: 10, is_winner: true },
      { id: 21, game_id: 10, player_id: 7, score: 8, is_winner: false },
    ],
    appSettings: [
      {
        id: 1,
        win_rate_min_games: 3,
        podium_rate_min_games: 0,
        stat_card_min_games: 5,
        new_game_password_hash: null,
        updated_at: '2026-03-01T00:00:00.000001Z',
      },
    ],
    auditLogs: [
      {
        id: 4,
        action: 'game.create',
        actor_type: 'game',
        actor_ip: null,
        entity_type: 'game',
        entity_id: '10',
        summary: 'Recorded game #10',
        metadata: '{"playerCount": 2}',
        created_at: '2026-02-01T23:16:01.700000Z',
      },
    ],
    sequences: new Map<string, number | null>([
      ['players', 51],
      ['games', 289],
      ['game_players', 1038],
      ['audit_logs', 270],
    ]),
    ...overrides,
  }
}

describe('writeSqlite', () => {
  let dir: string
  let out: string
  let reader: Database.Database | undefined

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'harborstats-pg-to-sqlite-test-'))
    out = join(dir, 'converted.db')
  })

  afterEach(() => {
    reader?.close()
    reader = undefined
    rmSync(dir, { recursive: true, force: true })
  })

  function open(): Database.Database {
    reader = new Database(out)
    return reader
  }

  it('sets exactly one integer sqlite_sequence row per table to the Postgres last_value', () => {
    writeSqlite(out, sourceData())

    const rows = open()
      .prepare('select name, seq, typeof(seq) as type from sqlite_sequence order by name')
      .all()
    expect(rows).toEqual([
      { name: 'audit_logs', seq: 270, type: 'integer' },
      { name: 'game_players', seq: 1038, type: 'integer' },
      { name: 'games', seq: 289, type: 'integer' },
      { name: 'players', seq: 51, type: 'integer' },
    ])
  })

  it('hands out the id after the Postgres last_value, never a deleted one', () => {
    writeSqlite(out, sourceData())

    const db = open()
    const { id } = db
      .prepare("insert into players (name, tier) values ('New', 'standard') returning id")
      .get() as { id: number }
    expect(id).toBe(52)
  })

  it('leaves no sqlite_sequence row for a sequence that was never used', () => {
    writeSqlite(
      out,
      sourceData({
        auditLogs: [],
        sequences: new Map<string, number | null>([
          ['players', 51],
          ['games', 289],
          ['game_players', 1038],
          ['audit_logs', null],
        ]),
      }),
    )

    const names = open().prepare('select name from sqlite_sequence order by name').pluck().all()
    expect(names).toEqual(['game_players', 'games', 'players'])
  })

  it('stores timestamps, IPs and JSON text as given and booleans as 0/1', () => {
    writeSqlite(out, sourceData())

    const db = open()
    expect(db.prepare('select id, created_at from players order by id').all()).toEqual([
      { id: 3, created_at: '2026-01-01T00:00:00.123456Z' },
      { id: 7, created_at: '2026-01-02T00:00:00.000000Z' },
    ])
    expect(db.prepare('select submitted_from_ip from games').pluck().get()).toBe('2001:db8::1')
    expect(db.prepare('select is_winner from game_players order by id').pluck().all()).toEqual([1, 0])
    expect(db.prepare('select metadata from audit_logs').pluck().get()).toBe('{"playerCount": 2}')
    expect(db.prepare('select updated_at from app_settings').pluck().get()).toBe(
      '2026-03-01T00:00:00.000001Z',
    )
  })

  it('returns the per-table row counts', () => {
    expect(writeSqlite(out, sourceData())).toEqual({
      players: 2,
      games: 1,
      game_players: 2,
      app_settings: 1,
      audit_logs: 1,
    })
  })
})
