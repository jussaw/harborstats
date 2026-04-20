import type { FullConfig } from '@playwright/test'
import { prepareTestDatabase } from '../helpers/db-admin'

export default async function globalSetup(_config: FullConfig): Promise<void> {
  await prepareTestDatabase()
}
