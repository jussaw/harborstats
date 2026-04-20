import { PlayerTier } from '@/lib/player-tier'
import type { Player } from '@/lib/players'

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

interface Props {
  player: Player
}

export function PlayerProfileCard({ player }: Props) {
  return (
    <div className="rounded-lg border border-[var(--gold)]/30 bg-[var(--navy-900)]/60 p-8">
      <div className="flex items-center gap-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-[var(--navy-800)]">
          <span style={cinzelStyle} className="text-xl text-[var(--gold)]">
            {player.name[0].toUpperCase()}
          </span>
        </div>
        <div>
          <h1 style={cinzelStyle} className="text-2xl tracking-wide text-[var(--gold)]">
            {player.name}
          </h1>
          {player.tier === PlayerTier.Premium && (
            <span
              style={cinzelStyle}
              className="mt-1 inline-block rounded bg-[var(--gold)]/15 px-1.5 py-0.5 text-xs tracking-widest text-[var(--gold)] uppercase"
            >
              PREMIUM
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
