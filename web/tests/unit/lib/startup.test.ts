import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runMigrations } from '@/lib/migrate';
import { openDatabase } from '@/lib/sqlite';
import { prepareDatabaseAtStartup } from '@/lib/startup';

function tableNames(path: string): string[] {
  const s = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const rows = s
      .prepare("select name from sqlite_master where type = 'table' order by name")
      .all() as { name: string }[];
    return rows.map((row) => row.name);
  } finally {
    s.close();
  }
}

describe('prepareDatabaseAtStartup', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'harborstats-startup-test-'));
    dbPath = join(dir, 'data', 'harborstats.db');
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('refuses a missing database in production and does not create the file', () => {
    expect(() =>
      prepareDatabaseAtStartup({ NODE_ENV: 'production', DATABASE_PATH: dbPath }),
    ).toThrow(
      `Refusing to start: database at ${dbPath} is missing or empty. Set DATABASE_ALLOW_CREATE=1 for a fresh install.`,
    );
    expect(existsSync(dbPath)).toBe(false);
  });

  it('refuses an existing file with no tables in production', () => {
    openDatabase(dbPath).close();
    expect(tableNames(dbPath)).toEqual([]);

    expect(() =>
      prepareDatabaseAtStartup({ NODE_ENV: 'production', DATABASE_PATH: dbPath }),
    ).toThrow(/^Refusing to start: database at .* is missing or empty\./);
    expect(tableNames(dbPath)).toEqual([]);
  });

  it('creates and migrates a missing database in production when DATABASE_ALLOW_CREATE=1', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    prepareDatabaseAtStartup({
      NODE_ENV: 'production',
      DATABASE_PATH: dbPath,
      DATABASE_ALLOW_CREATE: '1',
    });
    expect(existsSync(dbPath)).toBe(true);
    expect(tableNames(dbPath)).toContain('players');
    expect(log).toHaveBeenCalledWith(`[startup] Created a new database at ${dbPath}`);
  });

  it('starts on an existing migrated production database and keeps its rows', () => {
    const seed = openDatabase(dbPath);
    runMigrations(seed);
    seed.prepare("insert into players (name, tier) values ('Ada', 'premium')").run();
    seed.close();
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});

    expect(() =>
      prepareDatabaseAtStartup({ NODE_ENV: 'production', DATABASE_PATH: dbPath }),
    ).not.toThrow();

    const s = new Database(dbPath, { readonly: true });
    try {
      expect(s.prepare('select name from players').all()).toEqual([{ name: 'Ada' }]);
    } finally {
      s.close();
    }
    expect(log).toHaveBeenCalledWith(`[startup] Opened the existing database at ${dbPath}`);
  });

  it('creates and migrates a missing database outside production', () => {
    prepareDatabaseAtStartup({ NODE_ENV: 'development', DATABASE_PATH: dbPath });
    expect(existsSync(dbPath)).toBe(true);
    expect(tableNames(dbPath)).toContain('players');
  });

  it('refuses a zero-byte file in production', () => {
    openDatabase(dbPath).close();
    rmSync(dbPath);
    writeFileSync(dbPath, '');

    expect(() =>
      prepareDatabaseAtStartup({ NODE_ENV: 'production', DATABASE_PATH: dbPath }),
    ).toThrow(/is missing or empty/);
  });
});
