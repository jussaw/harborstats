import Link from 'next/link'
import { PageWidth } from '@/components/PageWidth'
import { listAllGames } from '@/lib/games'
import { listPlayersWithUsage } from '@/lib/players'

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const [games, players] = await Promise.all([listAllGames(), listPlayersWithUsage()])

  return (
    <PageWidth width="5xl" className="px-6 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="font-cinzel text-2xl tracking-wide text-(--gold)">Command Deck</h1>
          <p className="mt-1 text-sm text-(--cream)/50">Manage recorded games and player roster</p>
        </div>

        <div className="
          grid grid-cols-1 gap-4
          sm:grid-cols-2
        ">
          <Link
            href="/admin/games"
            className="
              group rounded-lg border p-6 transition-colors
              hover:border-(--gold)/50
            "
            style={{ borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)', background: 'color-mix(in srgb, var(--navy-900) 80%, black)' }}
          >
            <p className="font-cinzel text-3xl font-semibold text-(--gold)">{games.length}</p>
            <p className="
              font-cinzel mt-1 text-xs tracking-widest text-(--cream)/60
              uppercase
            ">
              Games Recorded
            </p>
            <p className="
              mt-3 text-xs text-(--gold)/60 transition-colors
              group-hover:text-(--gold)
            ">
              Edit or delete →
            </p>
          </Link>

          <Link
            href="/admin/players"
            className="
              group rounded-lg border p-6 transition-colors
              hover:border-(--gold)/50
            "
            style={{ borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)', background: 'color-mix(in srgb, var(--navy-900) 80%, black)' }}
          >
            <p className="font-cinzel text-3xl font-semibold text-(--gold)">{players.length}</p>
            <p className="
              font-cinzel mt-1 text-xs tracking-widest text-(--cream)/60
              uppercase
            ">
              Players on Roster
            </p>
            <p className="
              mt-3 text-xs text-(--gold)/60 transition-colors
              group-hover:text-(--gold)
            ">
              Add, rename, or remove →
            </p>
          </Link>
        </div>
      </div>
    </PageWidth>
  )
}
