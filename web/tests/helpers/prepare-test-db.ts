import { prepareTestDatabase } from './db-admin'

async function main(): Promise<void> {
  await prepareTestDatabase()
  console.log('Test database ready')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
