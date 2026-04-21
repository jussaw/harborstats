import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { PlayerTier } from '@/lib/player-tier'
import type { Player } from '@/lib/players'
import { PlayerProfileCard } from './PlayerProfileCard'

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

interface Props {
  players: Player[]
  selectedPlayer: Player | null
  mobileMode: 'list' | 'detail'
}

interface PlayersListProps {
  players: Player[]
  selectedPlayerId: number | null
}

function PlayersList({ players, selectedPlayerId }: PlayersListProps) {
  return (
    <aside className="
      rounded-2xl border border-(--gold)/20 bg-(--navy-900)/40 p-4
      sm:p-5
    ">
      <div className="mb-4 border-b border-(--gold)/10 pb-3">
        <p style={cinzelStyle} className="
          text-xs tracking-[0.3em] text-(--cream)/40 uppercase
        ">
          Players
        </p>
        <h1 style={cinzelStyle} className="
          mt-2 text-xl tracking-wide text-(--gold)
        ">
          Select a player
        </h1>
      </div>

      <div className="space-y-2">
        {players.map((player) => {
          const active = player.id === selectedPlayerId

          return (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              aria-current={active ? 'page' : undefined}
              className={`
                flex items-center gap-3 rounded-xl border p-3 text-sm
                transition-colors
                ${
                active
                  ? `border-(--gold)/45 bg-(--gold)/10 text-(--gold)`
                  : `
                    border-transparent bg-(--navy-800)/35 text-(--cream)/70
                    hover:border-(--gold)/20 hover:text-(--cream)
                  `
              }
              `}
            >
              <div className="
                flex size-10 shrink-0 items-center justify-center rounded-full
                border border-(--gold)/20 bg-(--navy-900)/70
              ">
                <User className="size-4" />
              </div>
              <div className="min-w-0">
                <p
                  style={cinzelStyle}
                  className={`
                    truncate tracking-widest uppercase
                    ${
                    player.tier === PlayerTier.Premium ? 'text-(--gold)' : ''
                  }
                  `}
                >
                  {player.name}
                </p>
                <p className="
                  mt-1 text-[11px] tracking-[0.2em] text-(--cream)/35 uppercase
                ">
                  {player.tier === PlayerTier.Premium ? 'Premium' : 'Standard'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}

function PlayerDetail({ player }: { player: Player }) {
  return (
    <div>
      <PlayerProfileCard player={player} />
      <p className="py-8 text-center text-sm text-(--cream)/40">Full profile stats coming soon.</p>
    </div>
  )
}

function PlayersDetailEmptyState() {
  return (
    <div className="
      flex min-h-full items-center justify-center rounded-xl border
      border-dashed border-(--gold)/15 bg-(--navy-900)/20 p-8
    ">
      <p className="text-center text-sm text-(--cream)/45">
        Choose a player to see their profile.
      </p>
    </div>
  )
}

export function PlayersSection({ players, selectedPlayer, mobileMode }: Props) {
  if (players.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="
          rounded-lg border border-(--gold)/30 bg-(--navy-900)/60 p-8
          text-center
        ">
          <h1 style={cinzelStyle} className="
            text-2xl tracking-wide text-(--gold)
          ">
            Players
          </h1>
          <p className="mt-4 text-sm text-(--cream)/70">No players yet.</p>
          <p className="mt-2 text-sm text-(--cream)/50">Add your first player in admin.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="
      mx-auto max-w-6xl px-4 py-6
      sm:px-6 sm:py-10
    ">
      <div className="sm:hidden">
        {mobileMode === 'list' ? (
          <PlayersList players={players} selectedPlayerId={null} />
        ) : (
          <div className="space-y-4">
            <Link
              href="/players"
              style={cinzelStyle}
              className="
                inline-flex items-center gap-2 rounded-md border
                border-(--gold)/20 bg-(--navy-900)/40 px-3 py-2 text-xs
                tracking-widest text-(--cream)/70 uppercase transition-colors
                hover:border-(--gold)/40 hover:text-(--gold)
              "
            >
              <ArrowLeft className="size-4" />
              <span>Back to players</span>
            </Link>
            {selectedPlayer ? <PlayerDetail player={selectedPlayer} /> : null}
          </div>
        )}
      </div>

      <div className="
        hidden min-h-136
        sm:grid sm:grid-cols-[18rem_minmax(0,1fr)] sm:gap-6
      ">
        <PlayersList players={players} selectedPlayerId={selectedPlayer?.id ?? null} />
        <div className="
          rounded-2xl border border-(--gold)/20 bg-(--navy-900)/30 p-6
        ">
          {selectedPlayer ? <PlayerDetail player={selectedPlayer} /> : <PlayersDetailEmptyState />}
        </div>
      </div>
    </main>
  )
}
