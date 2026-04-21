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
    <div className="rounded-lg border border-(--gold)/30 bg-(--navy-900)/60 p-8">
      <div>
        <h1 style={cinzelStyle} className="text-2xl tracking-wide text-(--gold)">
          {player.name}
        </h1>
        {player.tier === PlayerTier.Premium && (
          <span
            style={cinzelStyle}
            className="
              mt-1 inline-block rounded-sm bg-(--gold)/15 px-1.5 py-0.5 text-xs
              tracking-widest text-(--gold) uppercase
            "
          >
            PREMIUM
          </span>
        )}
      </div>
    </div>
  )
}
