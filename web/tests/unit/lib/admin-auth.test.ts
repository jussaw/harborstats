import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import {
  COOKIE_NAME,
  isAdminSession,
  requireAdminSession,
  signSession,
  verifyPassword,
  verifySession,
} from '@/lib/admin-auth';
import { signGameSession } from '@/lib/game-auth';
import { getNewGamePasswordHash } from '@/lib/settings';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/settings', () => ({
  getNewGamePasswordHash: vi.fn(),
}));

vi.mock('@/lib/password-hash', () => ({
  verifyPasswordHash: vi.fn(),
}));

describe('admin auth helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T12:00:00.000Z'));
    vi.mocked(getNewGamePasswordHash).mockResolvedValue('scrypt$somesalt$somehash');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('verifies the configured admin password and rejects missing passwords', async () => {
    vi.stubEnv('ADMIN_PASSWORD', 'harbor-secret');

    await expect(verifyPassword('harbor-secret')).resolves.toBe(true);
    await expect(verifyPassword('wrong-password')).resolves.toBe(false);
    // A wrong password of a different length is still rejected (length-independent compare).
    await expect(verifyPassword('x')).resolves.toBe(false);

    vi.stubEnv('ADMIN_PASSWORD', '');

    await expect(verifyPassword('harbor-secret')).resolves.toBe(false);
  });

  it('signs and verifies a valid session cookie', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    const cookie = await signSession();
    const [payload, signature] = cookie.split('.');
    const [scope, version, issuedAt] = payload.split(':');

    expect(payload).toMatch(/^admin:\d+:\d+$/);
    expect(scope).toBe('admin');
    expect(version).toBe('1');
    expect(issuedAt).toBe(String(Math.floor(new Date('2026-04-20T12:00:00.000Z').getTime() / 1000)));
    expect(signature).toMatch(/^[0-9a-f]+$/);
    await expect(verifySession(cookie)).resolves.toBe(true);
  });

  it('honours a custom ADMIN_SESSION_VERSION and rejects stale-version cookies', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');
    vi.stubEnv('ADMIN_SESSION_VERSION', '2');

    const cookie = await signSession();
    expect(cookie).toMatch(/^admin:2:\d+\./);
    await expect(verifySession(cookie)).resolves.toBe(true);

    // Bumping the version invalidates the previously-signed cookie.
    vi.stubEnv('ADMIN_SESSION_VERSION', '3');
    await expect(verifySession(cookie)).resolves.toBe(false);
  });

  it('rejects malformed session cookies', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    await expect(verifySession(undefined)).resolves.toBe(false);
    await expect(verifySession('missing-dot')).resolves.toBe(false);
    await expect(verifySession('not-a-number.deadbeef')).resolves.toBe(false);
    await expect(verifySession('1234.deadbeef')).resolves.toBe(false);
    await expect(verifySession('player:1234.deadbeef')).resolves.toBe(false);
  });

  it('rejects a game-scoped cookie signed with the same secret', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    const gameCookie = await signGameSession();

    await expect(verifySession(gameCookie)).resolves.toBe(false);
  });

  it('rejects a well-formed cookie with the wrong signature', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    const [issuedAt, signature] = (await signSession()).split('.');
    const wrongSignature = `${signature.slice(0, -1)}${signature.endsWith('0') ? '1' : '0'}`;

    await expect(verifySession(`${issuedAt}.${wrongSignature}`)).resolves.toBe(false);
  });

  it('rejects expired session cookies', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
    const cookie = await signSession();

    vi.setSystemTime(new Date('2026-04-01T00:00:01.000Z'));

    await expect(verifySession(cookie)).resolves.toBe(false);
  });

  it('fails closed when the session secret is missing', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', '');

    await expect(verifySession('1234.deadbeef')).resolves.toBe(false);
    await expect(signSession()).rejects.toThrow(/ADMIN_SESSION_SECRET/);
  });

  it('reads the admin session cookie from next headers', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    const cookie = await signSession();
    const cookiesMock = vi.mocked(cookies);
    cookiesMock.mockResolvedValue({
      get: vi.fn((name: string) => (name === COOKIE_NAME ? { value: cookie } : undefined)),
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(isAdminSession()).resolves.toBe(true);
    expect(cookiesMock).toHaveBeenCalledTimes(1);
  });

  it('requires a valid admin session from next headers', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    const cookie = await signSession();
    const cookiesMock = vi.mocked(cookies);
    cookiesMock.mockResolvedValue({
      get: vi.fn((name: string) => (name === COOKIE_NAME ? { value: cookie } : undefined)),
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(requireAdminSession()).resolves.toBeUndefined();
  });

  it('throws a consistent error when the admin session is missing', async () => {
    const cookiesMock = vi.mocked(cookies);
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => undefined),
    } as Awaited<ReturnType<typeof cookies>>);

    await expect(requireAdminSession()).rejects.toThrow('Admin authentication required');
  });
});
