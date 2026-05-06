import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import {
  isGameSession,
  signGameSession,
  verifyGamePassword,
  verifyGameSession,
  COOKIE_NAME,
} from '@/lib/game-auth';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/lib/settings', () => ({
  getNewGamePasswordHash: vi.fn(),
}));

vi.mock('@/lib/password-hash', () => ({
  verifyPasswordHash: vi.fn(),
}));

describe('game auth helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('signs and verifies a valid game session cookie', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    const cookie = await signGameSession();
    const [issuedAt, signature] = cookie.split('.');

    expect(issuedAt).toBe(String(Math.floor(new Date('2026-04-20T12:00:00.000Z').getTime() / 1000)));
    expect(signature).toMatch(/^[0-9a-f]+$/);
    await expect(verifyGameSession(cookie)).resolves.toBe(true);
  });

  it('rejects malformed session cookies', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    await expect(verifyGameSession(undefined)).resolves.toBe(false);
    await expect(verifyGameSession('missing-dot')).resolves.toBe(false);
    await expect(verifyGameSession('not-a-number.deadbeef')).resolves.toBe(false);
  });

  it('rejects a well-formed cookie with the wrong signature', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    const [issuedAt, signature] = (await signGameSession()).split('.');
    const wrongSignature = `${signature.slice(0, -1)}${signature.endsWith('0') ? '1' : '0'}`;

    await expect(verifyGameSession(`${issuedAt}.${wrongSignature}`)).resolves.toBe(false);
  });

  it('rejects expired session cookies', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    vi.setSystemTime(new Date('2026-03-01T00:00:00.000Z'));
    const cookie = await signGameSession();

    vi.setSystemTime(new Date('2026-04-01T00:00:01.000Z'));

    await expect(verifyGameSession(cookie)).resolves.toBe(false);
  });

  it('fails closed when the session secret is missing', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', '');

    await expect(verifyGameSession('1234.deadbeef')).resolves.toBe(false);
    await expect(signGameSession()).rejects.toThrow(/ADMIN_SESSION_SECRET/);
  });

  it('reads the hs_game session cookie from next headers', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'session-secret');

    const cookie = await signGameSession();
    const cookiesMock = vi.mocked(cookies);
    cookiesMock.mockResolvedValue({
      get: vi.fn((name: string) => (name === COOKIE_NAME ? { value: cookie } : undefined)),
    } as Awaited<ReturnType<typeof cookies>>);

    expect(COOKIE_NAME).toBe('hs_game');
    await expect(isGameSession()).resolves.toBe(true);
    expect(cookiesMock).toHaveBeenCalledTimes(1);
  });

  describe('verifyGamePassword', () => {
    it('returns false when no hash is stored', async () => {
      const { getNewGamePasswordHash } = await import('@/lib/settings');
      const { verifyPasswordHash } = await import('@/lib/password-hash');
      vi.mocked(getNewGamePasswordHash).mockResolvedValue(null);
      vi.mocked(verifyPasswordHash).mockResolvedValue(false);

      await expect(verifyGamePassword('any-input')).resolves.toBe(false);
    });

    it('returns true when verifyPasswordHash returns true', async () => {
      const { getNewGamePasswordHash } = await import('@/lib/settings');
      const { verifyPasswordHash } = await import('@/lib/password-hash');
      vi.mocked(getNewGamePasswordHash).mockResolvedValue('scrypt$somesalt$somehash');
      vi.mocked(verifyPasswordHash).mockResolvedValue(true);

      await expect(verifyGamePassword('correct-password')).resolves.toBe(true);
    });

    it('returns false when verifyPasswordHash returns false', async () => {
      const { getNewGamePasswordHash } = await import('@/lib/settings');
      const { verifyPasswordHash } = await import('@/lib/password-hash');
      vi.mocked(getNewGamePasswordHash).mockResolvedValue('scrypt$somesalt$somehash');
      vi.mocked(verifyPasswordHash).mockResolvedValue(false);

      await expect(verifyGamePassword('wrong-password')).resolves.toBe(false);
    });
  });
});
