import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'

const { DATABASE_URL } = process.env
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

async function main(): Promise<void> {
  const sql = postgres(DATABASE_URL!, { max: 1 })
  const db = drizzle(sql)
  await migrate(db, { migrationsFolder: './db/migrations' })
  await sql.end()
  console.log('Migration complete')
}

main().catch(console.error)
