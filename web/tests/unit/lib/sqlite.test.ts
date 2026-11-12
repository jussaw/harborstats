import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableWal, getDatabasePath, openDatabase } from '@/lib/sqlite';

describe('getDatabasePath', () => {
  it('reads DATABASE_PATH', () => {
    vi.stubEnv('DATABASE_PATH', '/data/harborstats.db');
    expect(getDatabasePath()).toBe('/data/harborstats.db');
  });

  it('defaults to ./data/harborstats.db', () => {
    vi.stubEnv('DATABASE_PATH', '');
    expect(getDatabasePath()).toBe('./data/harborstats.db');
  });
});

describe('openDatabase', () => {
  let dir: string;
  let opened: Database.Database | undefined;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'harborstats-sqlite-test-'));
  });

  afterEach(() => {
    opened?.close();
    opened = undefined;
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates the parent directory', () => {
    const tmpPath = join(dir, 'nested', 'deeper', 'test.db');
    opened = openDatabase(tmpPath);
    expect(existsSync(tmpPath)).toBe(true);
  });

  it('turns on foreign keys, WAL and a busy timeout', () => {
    opened = openDatabase(join(dir, 'test.db'));
    expect(opened.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(opened.pragma('journal_mode', { simple: true })).toBe('wal');
    expect(opened.pragma('busy_timeout', { simple: true })).toBe(5000);
  });

  it('yields the fixed-width format from the DB-side default expression', () => {
    opened = openDatabase(join(dir, 'test.db'));
    const row = opened
      .prepare("select (strftime('%Y-%m-%dT%H:%M:%f', 'now') || '000Z') as t")
      .get() as {
      t: string;
    };
    expect(row.t).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/);
  });
});

// Parallel `next build` workers creating the database at once made the WAL
// switch fail with SQLITE_BUSY: SQLite returns it immediately, without waiting
// on busy_timeout, when two new connections race for the exclusive lock.
describe('enableWal', () => {
  const busy = () => new Database.SqliteError('database is locked', 'SQLITE_BUSY');

  function fakeDatabase(pragma: (source: string) => unknown) {
    return { pragma: vi.fn(pragma) } as unknown as Database.Database & {
      pragma: ReturnType<typeof vi.fn>;
    };
  }

  it('retries SQLITE_BUSY until the switch succeeds', () => {
    let calls = 0;
    const sqlite = fakeDatabase(() => {
      calls += 1;
      if (calls < 3) throw busy();
      return 'wal';
    });

    expect(() => enableWal(sqlite)).not.toThrow();
    expect(sqlite.pragma).toHaveBeenCalledTimes(3);
    expect(sqlite.pragma).toHaveBeenCalledWith('journal_mode = WAL');
  });

  it('rethrows any other error at once', () => {
    const sqlite = fakeDatabase(() => {
      throw new Database.SqliteError('disk I/O error', 'SQLITE_IOERR');
    });

    expect(() => enableWal(sqlite)).toThrow('disk I/O error');
    expect(sqlite.pragma).toHaveBeenCalledTimes(1);
  });

  it('gives up with SQLITE_BUSY once the timeout runs out', () => {
    const sqlite = fakeDatabase(() => {
      throw busy();
    });

    expect(() => enableWal(sqlite, 60)).toThrow('database is locked');
    expect(sqlite.pragma.mock.calls.length).toBeGreaterThan(1);
  });
});
