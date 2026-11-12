import { rmSync } from 'node:fs'
import { runMigrations } from '../../lib/migrate'
import { openDatabase } from '../../lib/sqlite'
import { applyTestEnv, getTestDatabasePath } from './test-env'

applyTestEnv()

/** Creates the test database file if needed and applies pending migrations. Non-destructive. */
export async function migrateTestDatabase(): Promise<void> {
  const sqlite = openDatabase(getTestDatabasePath())
  try {
    runMigrations(sqlite)
  } finally {
    sqlite.close()
  }
}

/**
 * Starts from an empty, freshly migrated test database file. Destructive: run it
 * only before anything else has the file open.
 */
export async function prepareTestDatabase(): Promise<void> {
  const path = getTestDatabasePath()
  ;['', '-wal', '-shm'].forEach((suffix) => rmSync(`${path}${suffix}`, { force: true }))
  await migrateTestDatabase()
}
