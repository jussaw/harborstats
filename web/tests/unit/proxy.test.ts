import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/admin-auth', () => ({
  COOKIE_NAME: 'hs_admin',
  verifySession: vi.fn(),
}));

import { verifySession } from '@/lib/admin-auth';
import { proxy } from '@/proxy';

describe('proxy', () => {
  const verifySessionMock = vi.mocked(verifySession);

  beforeEach(() => {
    verifySessionMock.mockReset();
  });

  it('bypasses admin login requests', async () => {
    const response = await proxy(new NextRequest('http://localhost/admin/login'));

    expect(verifySessionMock).not.toHaveBeenCalled();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects unauthenticated admin requests to login with a next param', async () => {
    verifySessionMock.mockResolvedValue(false);

    const response = await proxy(new NextRequest('http://localhost/admin/games?tab=recent'));
    const location = new URL(response.headers.get('location')!);

    expect(verifySessionMock).toHaveBeenCalledWith(undefined);
    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/admin/login');
    expect(location.searchParams.get('next')).toBe('/admin/games');
    expect(location.searchParams.get('tab')).toBe('recent');
  });

  it('allows authenticated admin requests through', async () => {
    verifySessionMock.mockResolvedValue(true);

    const response = await proxy(
      new NextRequest('http://localhost/admin/players', {
        headers: { cookie: 'hs_admin=signed-cookie' },
      }),
    );

    expect(verifySessionMock).toHaveBeenCalledWith('signed-cookie');
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });
});
