/* eslint-disable no-console */
import postgres from 'postgres'

const { DATABASE_URL } = process.env
if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')

async function main(): Promise<void> {
  const sql = postgres(DATABASE_URL!, { max: 1 })
  await sql`
    INSERT INTO players (name, tier) VALUES
      ('Player Alpha', 'premium'),
      ('Player Bravo',   'premium'),
      ('Player Charlie',   'premium'),
      ('Player Delta',    'premium'),
      ('Player Echo',      'premium'),
      ('Player Foxtrot',  'premium'),
      ('Player Golf',     'standard'),
      ('Player Hotel',   'standard')
    ON CONFLICT (name) DO NOTHING
  `
  await sql.end()
  console.log('Seed complete')
}

main().catch(console.error)
