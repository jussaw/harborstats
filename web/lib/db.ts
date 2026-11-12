import type Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '@/db/schema'
import { getDatabasePath, openDatabase } from '@/lib/sqlite'

const globalForDb = globalThis as unknown as { sqlite?: Database.Database }

const sqlite = globalForDb.sqlite ?? openDatabase(getDatabasePath())

if (process.env.NODE_ENV !== 'production') globalForDb.sqlite = sqlite

export const db = drizzle(sqlite, { schema })
