import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

// Old-vs-new parity crawl for the Postgres → SQLite switchover. It drives two
// already-running apps (OLD_URL, NEW_URL); see README.md in this folder.
export default defineConfig({
  testDir: __dirname,
  testMatch: 'parity.spec.ts',
  // Cleaned at the start of every run; screenshots and the report land here.
  outputDir: join(__dirname, '../../test-results/parity'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60 * 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    trace: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
  },
})
