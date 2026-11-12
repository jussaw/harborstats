import { defineConfig } from 'drizzle-kit'
// Relative import: drizzle-kit does not resolve the `@/` alias.
import { getDatabasePath } from './lib/sqlite'

export default defineConfig({
  dialect: 'sqlite',
  schema: './db/schema.ts',
  out: './db/migrations',
  dbCredentials: {
    url: getDatabasePath(),
  },
})
