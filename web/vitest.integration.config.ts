import { defineConfig, mergeConfig } from 'vitest/config'
import { vitestBaseConfig } from './vitest.base'

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    test: {
      name: 'integration',
      environment: 'node',
      fileParallelism: false,
      include: ['tests/integration/**/*.test.ts'],
      setupFiles: ['tests/setup/integration.ts'],
      testTimeout: 20_000,
    },
  }),
)
