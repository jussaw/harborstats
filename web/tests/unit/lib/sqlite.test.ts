import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDatabasePath, openDatabase } from '@/lib/sqlite';

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
