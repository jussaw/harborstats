import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { applyTestEnv, getAdminDatabaseUrl, getTestDatabaseName, getTestDatabaseUrl } from './test-env'

applyTestEnv()

function quoteIdentifier(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export async function ensureTestDatabase(): Promise<void> {
  const adminSql = postgres(getAdminDatabaseUrl(), { max: 1 })

  try {
    const result = await adminSql<{ exists: 1 }[]>`
      SELECT 1 AS exists
      FROM pg_database
      WHERE datname = ${getTestDatabaseName()}
    `

    if (result.length === 0) {
      await adminSql.unsafe(`CREATE DATABASE ${quoteIdentifier(getTestDatabaseName())}`)
    }
  } finally {
    await adminSql.end()
  }
}

export async function migrateTestDatabase(): Promise<void> {
  const sql = postgres(getTestDatabaseUrl(), { max: 1 })

  try {
    const db = drizzle(sql)
    await migrate(db, { migrationsFolder: './db/migrations' })
  } finally {
    await sql.end()
  }
}

export async function prepareTestDatabase(): Promise<void> {
  await ensureTestDatabase()
  await migrateTestDatabase()
}
