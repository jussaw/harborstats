import { defineConfig } from '@playwright/test'
import { TEST_BASE_URL, TEST_ENV, applyTestEnv } from './tests/helpers/test-env'

const TEST_PORT = new URL(TEST_BASE_URL).port || '3100'
const WEB_SERVER_COMMAND =
  `pnpm exec next build && pnpm exec next start --hostname 127.0.0.1 --port ${TEST_PORT}`

process.env.TEST_BASE_URL = TEST_BASE_URL

applyTestEnv()

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: TEST_BASE_URL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: WEB_SERVER_COMMAND,
    env: {
      ...process.env,
      ...TEST_ENV,
      TEST_BASE_URL,
      NODE_ENV: 'test',
    },
    url: TEST_BASE_URL,
    reuseExistingServer: false,
  },
  globalSetup: './tests/e2e/global-setup.ts',
})
