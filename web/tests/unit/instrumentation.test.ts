import { describe, expect, it, vi } from 'vitest';

const prepareDatabaseAtStartup = vi.fn();

vi.mock('@/lib/startup', () => ({
  prepareDatabaseAtStartup: (...args: unknown[]) => prepareDatabaseAtStartup(...args),
}));

describe('instrumentation register', () => {
  it('prepares the database in the Node.js runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const { register } = await import('@/instrumentation');
    await register();
    expect(prepareDatabaseAtStartup).toHaveBeenCalledTimes(1);
  });

  it('skips the database in the edge runtime', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    const { register } = await import('@/instrumentation');
    await register();
    expect(prepareDatabaseAtStartup).not.toHaveBeenCalled();
  });

  it('lets a startup failure reject register so the server does not start', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    prepareDatabaseAtStartup.mockImplementation(() => {
      throw new Error('Refusing to start: database at /data/harborstats.db is missing or empty.');
    });
    const { register } = await import('@/instrumentation');
    await expect(register()).rejects.toThrow(/^Refusing to start/);
  });
});
