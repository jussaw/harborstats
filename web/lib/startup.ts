import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { runMigrations } from '@/lib/migrate';
import { DEFAULT_DATABASE_PATH, openDatabase } from '@/lib/sqlite';

/** True when the file exists and holds at least one table of its own. */
function hasTables(path: string): boolean {
  if (!existsSync(path)) return false;
  // Read-only, so a file this check refuses is left exactly as it was found.
  const sqlite = new Database(path, { readonly: true, fileMustExist: true });
  try {
    const row = sqlite
      .prepare(
        "select count(*) as n from sqlite_master where type = 'table' and name not like 'sqlite\\_%' escape '\\'",
      )
      .get() as { n: number };
    return row.n > 0;
  } finally {
    sqlite.close();
  }
}

/**
 * Runs before the server takes requests (see `instrumentation.ts`): applies
 * pending migrations to the database at `DATABASE_PATH`.
 *
 * In production a missing or table-less file means a wrong volume or path, not
 * a fresh install, so startup throws instead of serving an empty site — unless
 * `DATABASE_ALLOW_CREATE=1` says a new database is intended.
 */
export function prepareDatabaseAtStartup(env: NodeJS.ProcessEnv = process.env): void {
  const path = env.DATABASE_PATH || DEFAULT_DATABASE_PATH;
  const existed = hasTables(path);

  if (env.NODE_ENV === 'production' && !existed && env.DATABASE_ALLOW_CREATE !== '1') {
    throw new Error(
      `Refusing to start: database at ${path} is missing or empty. Set DATABASE_ALLOW_CREATE=1 for a fresh install.`,
    );
  }

  const sqlite = openDatabase(path);
  try {
    runMigrations(sqlite);
  } finally {
    sqlite.close();
  }

  // eslint-disable-next-line no-console -- no logger abstraction; the switchover reads this line
  console.log(
    existed
      ? `[startup] Opened the existing database at ${path}`
      : `[startup] Created a new database at ${path}`,
  );
}
