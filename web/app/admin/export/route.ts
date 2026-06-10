import { isAdminSession } from '@/lib/admin-auth'
import { listAllGames } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { gamesToCsv } from '@/lib/export'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // proxy.ts already gates /admin/:path*; this check is defense in depth.
  if (!(await isAdminSession())) {
    return new Response('Unauthorized', { status: 401 })
  }

  const format = new URL(request.url).searchParams.get('format') ?? 'csv'
  if (format !== 'csv' && format !== 'json') {
    return new Response('Unsupported format. Use ?format=csv or ?format=json.', { status: 400 })
  }

  const date = new Date().toISOString().slice(0, 10)

  if (format === 'json') {
    const [games, players] = await Promise.all([listAllGames(), getPlayers()])
    return Response.json(
      { exportedAt: new Date().toISOString(), players, games },
      {
        headers: {
          'Content-Disposition': `attachment; filename="harborstats-export-${date}.json"`,
        },
      },
    )
  }

  const games = await listAllGames()
  return new Response(gamesToCsv(games), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="harborstats-games-${date}.csv"`,
    },
  })
}
