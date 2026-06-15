import Link from 'next/link'
import { PageWidth } from '@/components/PageWidth'
import { cardSurfaceClasses } from '@/components/ui/Card'
import { listAllGames } from '@/lib/games'
import { listPlayersWithUsage } from '@/lib/players'

export const dynamic = 'force-dynamic'

export default async function AdminHomePage() {
  const [games, players] = await Promise.all([listAllGames(), listPlayersWithUsage()])

  return (
    <PageWidth width="5xl" className="px-6 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="font-cinzel text-2xl tracking-wide text-(--cream)">Command Deck</h1>
          <p className="mt-1 text-sm text-(--cream)/50">Manage recorded games and player roster</p>
        </div>

        <div className="
          grid grid-cols-1 gap-4
          sm:grid-cols-2
        ">
          <Link
            href="/admin/games"
            className={`
              group p-6 transition-colors
              hover:border-(--gold)/50
              ${cardSurfaceClasses}
            `}
          >
            <p className="text-3xl font-semibold text-(--gold)">{games.length}</p>
            <p className="
              mt-1 text-[10px] font-medium tracking-[0.2em] text-(--cream)/60
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
            className={`
              group p-6 transition-colors
              hover:border-(--gold)/50
              ${cardSurfaceClasses}
            `}
          >
            <p className="text-3xl font-semibold text-(--gold)">{players.length}</p>
            <p className="
              mt-1 text-[10px] font-medium tracking-[0.2em] text-(--cream)/60
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

          <Link
            href="/admin/audit"
            className={`
              group p-6 transition-colors
              hover:border-(--gold)/50
              sm:col-span-2
              ${cardSurfaceClasses}
            `}
          >
            <p className="
              text-[10px] font-medium tracking-[0.2em] text-(--cream)/60
              uppercase
            ">
              Audit History
            </p>
            <p className="mt-1 text-xs text-(--cream)/40">
              Review every recorded action with its actor IP and timestamp
            </p>
            <p className="
              mt-3 text-xs text-(--gold)/60 transition-colors
              group-hover:text-(--gold)
            ">
              View history →
            </p>
          </Link>
        </div>

        <div
          className={`
            p-6
            ${cardSurfaceClasses}
          `}
        >
          <h2 className="
            text-[10px] font-medium tracking-[0.2em] text-(--cream)/60 uppercase
          ">
            Export Data
          </h2>
          <p className="mt-1 text-xs text-(--cream)/40">
            Download every recorded game for backups or offline analysis
          </p>
          <div className="mt-4 flex gap-3">
            <a
              href="/admin/export?format=csv"
              download
              className="
                rounded-lg border border-(--border-gold) px-4 py-2 text-xs
                font-semibold text-(--gold) transition-colors
                hover:border-(--gold) hover:bg-(--gold)/10
              "
            >
              Download CSV
            </a>
            <a
              href="/admin/export?format=json"
              download
              className="
                rounded-lg border border-(--border-gold) px-4 py-2 text-xs
                font-semibold text-(--gold) transition-colors
                hover:border-(--gold) hover:bg-(--gold)/10
              "
            >
              Download JSON
            </a>
          </div>
        </div>
      </div>
    </PageWidth>
  )
}
