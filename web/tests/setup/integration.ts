import { beforeAll, beforeEach } from 'vitest'
import { resetDatabase } from '../helpers/db'
import { applyTestEnv } from '../helpers/test-env'

applyTestEnv()

beforeAll(async () => {
  await resetDatabase()
})

beforeEach(async () => {
  await resetDatabase()
})
