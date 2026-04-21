const LOCALHOST = '127.0.0.1'

export const TEST_BASE_URL = process.env.TEST_BASE_URL ?? `http://${LOCALHOST}:3100`

export const TEST_ENV = {
  DATABASE_URL: process.env.DATABASE_URL ?? `postgres://postgres:postgres@${LOCALHOST}:5432/harborstats_test`,
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
  return TEST_ENV
}

export function getTestDatabaseUrl(): string {
  return process.env.DATABASE_URL ?? TEST_ENV.DATABASE_URL
}

export function getAdminDatabaseUrl(): string {
  const url = new URL(getTestDatabaseUrl())
  url.pathname = '/postgres'
  return url.toString()
}

export function getTestDatabaseName(): string {
  const { pathname } = new URL(getTestDatabaseUrl())
  return pathname.startsWith('/') ? pathname.slice(1) : pathname
}
