import type Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export const DEFAULT_MIGRATIONS_FOLDER = './db/migrations';

/**
 * Applies pending migrations with foreign keys switched off, then checks them.
 *
 * Drizzle runs the migrations inside one transaction, where SQLite ignores
 * `PRAGMA foreign_keys`. With foreign keys on, a drizzle-kit table rebuild
 * (`DROP TABLE games` → rename `__new_games`) would cascade-delete every score.
 * So they are off for the migration, any violation it leaves fails the run, and
 * they are always switched back on.
 */
export function runMigrations(
  sqlite: Database.Database,
  migrationsFolder: string = DEFAULT_MIGRATIONS_FOLDER,
): void {
  sqlite.pragma('foreign_keys = OFF');
  try {
    migrate(drizzle(sqlite), { migrationsFolder });
    const violations = sqlite.pragma('foreign_key_check') as unknown[];
    if (violations.length > 0) {
      throw new Error(
        `Migrations left ${violations.length} foreign key violation(s): ${JSON.stringify(violations.slice(0, 5))}`,
      );
    }
  } finally {
    sqlite.pragma('foreign_keys = ON');
  }
}
