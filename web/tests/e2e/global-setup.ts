import type { FullConfig } from '@playwright/test'
import { migrateTestDatabase } from '../helpers/db-admin'

export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Non-destructive: the web server may already have the file open. The
  // `test:e2e` script recreates it before Playwright starts; each test resets rows.
  await migrateTestDatabase()
}
