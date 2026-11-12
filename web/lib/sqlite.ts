import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

export const DEFAULT_DATABASE_PATH = './data/harborstats.db';

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH;
}

// Every connection must go through here so the pragmas are never skipped:
// without foreign_keys a game delete would silently orphan its scores.
export function openDatabase(path: string): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('journal_mode = WAL');
  return sqlite;
}
