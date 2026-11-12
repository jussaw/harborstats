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

  // Next only logs a register() failure and keeps the server up answering 500s,
  // so a refused or failed database must end the process itself.
  it('logs the startup failure and exits with code 1', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const failure = new Error(
      'Refusing to start: database at /data/harborstats.db is missing or empty.',
    );
    prepareDatabaseAtStartup.mockImplementation(() => {
      throw failure;
    });
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { register } = await import('@/instrumentation');
    await register();

    expect(logError).toHaveBeenCalledWith(failure);
    expect(exit).toHaveBeenCalledWith(1);
  });
});
