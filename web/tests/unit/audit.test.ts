import { afterEach, describe, expect, test, vi } from 'vitest';
import { recordAudit } from '@/lib/audit';

const mocked = vi.hoisted(() => ({
  insertMock: vi.fn(),
  headersMock: vi.fn(async () => new Headers({ 'x-forwarded-for': '203.0.113.9' })),
}));

vi.mock('@/lib/db', () => ({
  db: { insert: mocked.insertMock },
}));

vi.mock('next/headers', () => ({
  headers: mocked.headersMock,
}));

describe('recordAudit', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('inserts an audit row with the resolved actor IP', async () => {
    const valuesMock = vi.fn(async () => undefined);
    mocked.insertMock.mockReturnValue({ values: valuesMock });

    await recordAudit({
      action: 'player.create',
      actorType: 'admin',
      entityType: 'player',
      entityId: 42,
      summary: 'Added player "Ada"',
    });

    expect(valuesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'player.create',
        actorType: 'admin',
        actorIp: '203.0.113.9',
        entityType: 'player',
        entityId: '42',
        summary: 'Added player "Ada"',
        metadata: null,
      }),
    );
  });

  test('does not throw and logs the error when the insert fails', async () => {
    const failure = new Error('database offline');
    mocked.insertMock.mockReturnValue({
      values: vi.fn(() => Promise.reject(failure)),
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      recordAudit({ action: 'game.delete', actorType: 'admin', summary: 'Deleted game #1' }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith(
      '[audit] failed to record',
      expect.objectContaining({ action: 'game.delete', err: failure }),
    );

    errorSpy.mockRestore();
  });
});
