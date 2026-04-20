import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { TEST_ENV } from './tests/helpers/test-env'

export const vitestBaseConfig = defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    env: TEST_ENV,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    passWithNoTests: false,
    unstubEnvs: true,
    unstubGlobals: true,
  },
})
