import type Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

export const DEFAULT_MIGRATIONS_FOLDER = './db/migrations';

export function runMigrations(
  sqlite: Database.Database,
  migrationsFolder: string = DEFAULT_MIGRATIONS_FOLDER,
): void {
  migrate(drizzle(sqlite), { migrationsFolder });
}
