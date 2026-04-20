import { applyTestEnv } from '../helpers/test-env'

applyTestEnv()

export async function resetE2eDatabase(): Promise<void> {
  const { resetDatabase } = require('../helpers/db')
  await resetDatabase()
}

export async function createE2ePlayer(...args: unknown[]) {
  const { createTestPlayer } = require('../helpers/db')
  return createTestPlayer(...args)
}

export async function createE2eGame(...args: unknown[]) {
  const { createTestGame } = require('../helpers/db')
  return createTestGame(...args)
}
