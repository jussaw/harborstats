// Next calls register() once per server start and waits for it before taking
// requests; a throw here fails startup. The import stays inside the Node.js
// branch so the native SQLite module never reaches the edge bundle.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { prepareDatabaseAtStartup } = await import('@/lib/startup');
    prepareDatabaseAtStartup();
  }
}
