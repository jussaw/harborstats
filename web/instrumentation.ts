// Next calls register() once per server start and waits for it before taking
// requests. The import stays inside the Node.js branch so the native SQLite
// module never reaches the edge bundle.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prepareDatabaseAtStartup } = await import('@/lib/startup');
    try {
      prepareDatabaseAtStartup();
    } catch (error) {
      // Next only logs a failed register() and keeps serving 500s, so exit:
      // a refused or failed database must stop the container.
      // eslint-disable-next-line no-console -- no logger abstraction; surface the failure to server logs
      console.error(error);
      process.exit(1);
    }
  }
}
