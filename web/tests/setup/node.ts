import { afterEach, vi } from 'vitest'
import { applyTestEnv } from '../helpers/test-env'

applyTestEnv()

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
