import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '@/db/schema'

const globalForDb = globalThis as unknown as { sql: postgres.Sql }

const sql = globalForDb.sql ?? postgres(process.env.DATABASE_URL!)

if (process.env.NODE_ENV !== 'production') globalForDb.sql = sql

export const db = drizzle(sql, { schema })
