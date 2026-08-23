import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { TEST_ENV } from './tests/helpers/test-env'
import { validateNodeVersion } from './scripts/check-node-version'

// Enforce the Node version contract at test-config load time, not just at
// install time. This catches the common case of switching Node versions
// (e.g. via nvm) against an existing node_modules without re-running install.
const nodeErrors = validateNodeVersion(process.version)
if (nodeErrors.length > 0) {
  throw new Error(
    `\n[harborstats] Node version check failed.\n${nodeErrors.map((e) => `  ${e}`).join('\n')}`,
  )
}

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
