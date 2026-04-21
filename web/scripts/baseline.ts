import postgres from 'postgres'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const { DATABASE_URL } = process.env
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

const journal = JSON.parse(
  readFileSync(join(process.cwd(), 'db/migrations/meta/_journal.json'), 'utf-8'),
) as { entries: { tag: string }[] }

const firstTag = journal.entries[0]?.tag
if (!firstTag) throw new Error('No migrations found in journal')

const migrationSql = readFileSync(
  join(process.cwd(), `db/migrations/${firstTag}.sql`),
  'utf-8',
)
const hash = createHash('sha256').update(migrationSql).digest('hex')

async function main(): Promise<void> {
  const sql = postgres(DATABASE_URL!, { max: 1 })
  await sql`CREATE SCHEMA IF NOT EXISTS drizzle`
  await sql`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id        SERIAL PRIMARY KEY,
      hash      TEXT NOT NULL,
      created_at BIGINT
    )
  `
  const [existing] = await sql<{ id: number }[]>`
    SELECT id FROM drizzle.__drizzle_migrations WHERE hash = ${hash}
  `
  if (existing) {
    console.log('Baseline already applied, skipping.')
  } else {
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${hash}, ${Date.now()})
    `
    console.log(`Baseline applied: marked ${firstTag} as completed.`)
  }
  await sql.end()
}

main().catch(console.error)
