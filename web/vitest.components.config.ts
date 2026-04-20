import { defineConfig, mergeConfig } from 'vitest/config'
import { vitestBaseConfig } from './vitest.base'

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    test: {
      name: 'components',
      environment: 'jsdom',
      include: ['tests/components/**/*.test.ts', 'tests/components/**/*.test.tsx'],
      setupFiles: ['tests/setup/components.ts'],
    },
  }),
)
