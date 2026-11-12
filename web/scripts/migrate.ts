import { runMigrations } from '../lib/migrate'
import { getDatabasePath, openDatabase } from '../lib/sqlite'

function main(): void {
  const path = getDatabasePath()
  const sqlite = openDatabase(path)
  try {
    runMigrations(sqlite)
  } finally {
    sqlite.close()
  }
  console.log(`Migration complete (${path})`)
}

try {
  main()
} catch (error: unknown) {
  console.error(error)
  process.exitCode = 1
}
