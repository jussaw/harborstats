import Database from 'better-sqlite3';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { setNewGamePasswordAction } from '@/app/admin/settings/actions';

const SUBMITTED_PASSWORD = 'harbor-crew-secret-2026';
const PASSWORD_HASH = 'scrypt$16384$8$1$c2FsdHl2YWx1ZQ$3f9a1c0deadbeefhashmaterial';
const FAILING_QUERY = 'insert into "app_settings" ("id", "new_game_password_hash") values (?, ?)';
// Fixed stand-ins for the session material a request-scoped error can carry.
// Never source these from `process.env`: a failed `not.toContain` prints the
// expected substring, so reading the live `ADMIN_SESSION_SECRET` would spill it
// into the test output. `TEST_ENV` passes the real value through when it is set.
const SESSION_SECRET = 'synthetic-admin-session-secret-not-a-real-value';
const SESSION_COOKIE = 'hs_admin=synthetic-session-payload.synthetic-signature';

/** Everything a diagnostic must never surface, keyed by label for failure output. */
const SENSITIVE_MATERIAL: Record<string, string> = {
  'the submitted password': SUBMITTED_PASSWORD,
  'the stored password hash': PASSWORD_HASH,
  'the failing SQL statement': FAILING_QUERY,
  'the admin session secret': SESSION_SECRET,
  'the admin session cookie': SESSION_COOKIE,
};

const mocked = vi.hoisted(() => {
  class InvalidPasswordError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'InvalidPasswordError';
    }
  }

  return {
    InvalidPasswordError,
    setNewGamePasswordMock: vi.fn(),
    updateRateMinGamesMock: vi.fn(),
    recordAuditMock: vi.fn(async () => undefined),
    requireAdminSessionMock: vi.fn(async () => undefined),
    revalidatePathMock: vi.fn(),
  };
});

// Mocking the whole settings/audit surface keeps this a pure unit test: the
// action's module graph never reaches `@/lib/db`, so no connection is opened.
vi.mock('@/lib/settings', () => ({
  InvalidPasswordError: mocked.InvalidPasswordError,
  setNewGamePassword: mocked.setNewGamePasswordMock,
  updateRateMinGames: mocked.updateRateMinGamesMock,
}));

vi.mock('@/lib/audit', () => ({
  recordAudit: mocked.recordAuditMock,
}));

vi.mock('@/lib/admin-auth', () => ({
  requireAdminSession: mocked.requireAdminSessionMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocked.revalidatePathMock,
}));

function buildFormData(password: string): FormData {
  const formData = new FormData();
  formData.set('new_game_password', password);
  return formData;
}

/**
 * Mirrors how the real stack reports a failed write, assuming the worst case:
 * Drizzle's `DrizzleQueryError` interpolates the bound params into its message
 * and keeps the query and params as fields, with the raw better-sqlite3
 * `SqliteError` as its `cause`. For this insert a bound param *is* the password
 * hash, so the error itself carries secret material.
 */
function buildPersistenceFailure(): Error {
  const error = new Error(`Failed query: ${FAILING_QUERY}\nparams: 1,${PASSWORD_HASH}`, {
    cause: new Database.SqliteError('attempt to write a readonly database', 'SQLITE_READONLY'),
  });
  error.name = 'DrizzleQueryError';
  return Object.assign(error, {
    query: FAILING_QUERY,
    params: [1, PASSWORD_HASH],
    // Request-scoped session material that error wrappers routinely attach.
    // Without it the two session `not.toContain` assertions below would pass
    // vacuously. Nesting it also proves `flattenDiagnostic` recurses, so a
    // leak buried one level deep cannot slip through either.
    requestContext: {
      sessionSecret: SESSION_SECRET,
      cookie: SESSION_COOKIE,
    },
  });
}

/** Flattens what `console.error` would surface for these arguments into one string. */
function flattenDiagnostic(calls: unknown[][]): string {
  const seen = new WeakSet<object>();
  const parts: string[] = [];

  const walk = (value: unknown): void => {
    if (value === null || value === undefined) return;
    if (typeof value !== 'object') {
      parts.push(String(value));
      return;
    }
    if (seen.has(value)) return;
    seen.add(value);
    if (value instanceof Error) {
      // message/stack are non-enumerable, so collect them explicitly.
      parts.push(value.name, value.message, value.stack ?? '');
    }
    Object.entries(value).forEach(([key, nested]) => {
      parts.push(key);
      walk(nested);
    });
  };

  calls.flat().forEach(walk);
  return parts.join('\n');
}

describe('setNewGamePasswordAction', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  test('logs a server-only diagnostic when the password fails to persist', async () => {
    mocked.setNewGamePasswordMock.mockRejectedValue(buildPersistenceFailure());

    const result = await setNewGamePasswordAction({}, buildFormData(SUBMITTED_PASSWORD));

    // The client learns nothing beyond the generic failure.
    expect(result).toEqual({ ok: false, error: 'Failed to save password.' });

    // ...but the operator gets a server-side diagnostic instead of silence.
    expect(errorSpy).toHaveBeenCalledTimes(1);

    // A failed write must never leave a success audit behind.
    expect(mocked.recordAuditMock).not.toHaveBeenCalled();

    const diagnostic = flattenDiagnostic(errorSpy.mock.calls);
    Object.entries(SENSITIVE_MATERIAL).forEach(([label, secret]) => {
      expect(diagnostic, `diagnostic must not leak ${label}`).not.toContain(secret);
    });
  });

  test('returns the validation message without a diagnostic for InvalidPasswordError', async () => {
    mocked.setNewGamePasswordMock.mockRejectedValue(
      new mocked.InvalidPasswordError('Password must be at least 4 characters'),
    );

    const result = await setNewGamePasswordAction({}, buildFormData('ab'));

    expect(result).toEqual({ ok: false, error: 'Password must be at least 4 characters' });
    expect(errorSpy).not.toHaveBeenCalled();
    expect(mocked.recordAuditMock).not.toHaveBeenCalled();
  });

  test('records the audit before revalidating when the password persists', async () => {
    mocked.setNewGamePasswordMock.mockResolvedValue(undefined);

    const result = await setNewGamePasswordAction({}, buildFormData(SUBMITTED_PASSWORD));

    expect(result).toEqual({ ok: true });
    expect(errorSpy).not.toHaveBeenCalled();
    expect(mocked.recordAuditMock).toHaveBeenCalledTimes(1);
    expect(mocked.recordAuditMock).toHaveBeenCalledWith({
      action: 'settings.password_change',
      actorType: 'admin',
      entityType: 'settings',
      summary: 'Changed the new-game password',
    });
    expect(mocked.recordAuditMock.mock.invocationCallOrder[0]).toBeLessThan(
      mocked.revalidatePathMock.mock.invocationCallOrder[0],
    );
  });
});
