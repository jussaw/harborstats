import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

export const DEFAULT_DATABASE_PATH = './data/harborstats.db';

const BUSY_TIMEOUT_MS = 5000;
const WAL_RETRY_DELAY_MS = 25;

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH || DEFAULT_DATABASE_PATH;
}

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Switching a database that is not in WAL mode yet needs an exclusive lock.
// When several new connections race for it (parallel `next build` workers
// creating the file), SQLite answers SQLITE_BUSY at once instead of waiting on
// busy_timeout, so retry within the same time budget.
export function enableWal(sqlite: Database.Database, timeoutMs: number = BUSY_TIMEOUT_MS): void {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      sqlite.pragma('journal_mode = WAL');
      return;
    } catch (error) {
      const busy = error instanceof Database.SqliteError && error.code === 'SQLITE_BUSY';
      if (!busy || Date.now() >= deadline) throw error;
      sleepSync(WAL_RETRY_DELAY_MS);
    }
  }
}

// Every connection must go through here so the pragmas are never skipped:
// without foreign_keys a game delete would silently orphan its scores.
export function openDatabase(path: string): Database.Database {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
  sqlite.pragma('foreign_keys = ON');
  enableWal(sqlite);
  return sqlite;
}
