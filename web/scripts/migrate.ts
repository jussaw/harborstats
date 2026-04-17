import postgres from 'postgres'
import { readFileSync } from 'fs'
import { join } from 'path'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

const sql = postgres(DATABASE_URL)
const schema = readFileSync(join(process.cwd(), 'db/schema.sql'), 'utf-8')

await sql.unsafe(schema)
await sql.end()
console.log('Migration complete')
