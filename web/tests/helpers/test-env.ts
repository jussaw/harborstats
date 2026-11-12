import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const LOCALHOST = '127.0.0.1'

export const TEST_BASE_URL = process.env.TEST_BASE_URL ?? `http://${LOCALHOST}:3100`

// Tests delete and recreate this file, so it never comes from DATABASE_PATH: an
// exported DATABASE_PATH pointing at real data must not be wiped by a test run.
// The cwd hash gives each checkout (and worktree) its own file.
const DEFAULT_TEST_DATABASE_PATH = join(
  tmpdir(),
  `harborstats-test-${createHash('sha256').update(process.cwd()).digest('hex').slice(0, 12)}`,
  'harborstats_test.db',
)

export const TEST_ENV = {
  DATABASE_PATH: process.env.TEST_DATABASE_PATH || DEFAULT_TEST_DATABASE_PATH,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? 'harborstats-test-password',
  ADMIN_SESSION_SECRET:
    process.env.ADMIN_SESSION_SECRET ?? 'harborstats-test-session-secret-please-change',
  NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED ?? '1',
  TZ: process.env.TZ ?? 'UTC',
} as const

export function applyTestEnv(env = process.env): typeof TEST_ENV {
  Object.entries(TEST_ENV).forEach(([key, value]) => {
    if (!env[key]) {
      Reflect.set(env, key, value)
    }
  })
  // Always the test file, even when DATABASE_PATH was already set.
  Reflect.set(env, 'DATABASE_PATH', TEST_ENV.DATABASE_PATH)
  return TEST_ENV
}

export function getTestDatabasePath(): string {
  return TEST_ENV.DATABASE_PATH
}

/**
 * Throws unless `path` is the test database file. Called before anything that
 * wipes data, so a connection opened on a real database is never cleared.
 */
export function assertIsTestDatabase(path: string): void {
  if (resolve(path) !== resolve(getTestDatabasePath())) {
    throw new Error(
      `Refusing to wipe ${path}: it is not the test database (${getTestDatabasePath()})`,
    )
  }
}
