import { defineConfig, mergeConfig } from 'vitest/config'
import { vitestBaseConfig } from './vitest.base'

// Node ≥25 exposes a built-in `localStorage`/`sessionStorage` global that
// vitest 4's jsdom environment refuses to overwrite (fixed only in vitest 5).
// That leaves tests with Node's no-op storage stub instead of jsdom's real
// DOM `Storage`, so `localStorage.clear()` in the afterEach hook crashes every
// component test. The `--no-webstorage` flag removes Node's globals before the
// jsdom environment initialises, letting jsdom's Storage populate the window
// as intended. The flag does not exist before Node 25, so we guard it to avoid
// breaking Node 22 (the CI/Docker baseline).
const nodeMajor = Number(process.versions.node.split('.')[0])
const execArgv = nodeMajor >= 25 ? ['--no-webstorage'] : []

export default mergeConfig(
  vitestBaseConfig,
  defineConfig({
    test: {
      name: 'components',
      environment: 'jsdom',
      execArgv,
      include: ['tests/components/**/*.test.ts', 'tests/components/**/*.test.tsx'],
      setupFiles: ['tests/setup/components.ts'],
    },
  }),
)
