import { defineConfig, mergeConfig } from 'vitest/config'
import { vitestBaseConfig } from './vitest.base'

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    test: {
      name: 'unit',
      environment: 'node',
      include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
      setupFiles: ['tests/setup/node.ts'],
    },
  }),
)
