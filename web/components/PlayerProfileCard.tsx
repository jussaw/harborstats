import { PlayerTier } from '@/lib/player-tier'
import type { RecentGame } from '@/lib/games'
import type { Player } from '@/lib/players'
import { PlayerGamesModal } from './PlayerGamesModal'
import { Badge } from './ui/Badge'
import { cardSurfaceClasses } from './ui/Card'

interface Props {
  player: Player
  games: RecentGame[]
}

export function PlayerProfileCard({ player, games }: Props) {
  return (
    <div
      className={`
        p-8
        ${cardSurfaceClasses}
      `}
    >
      <div
        className="
          flex flex-col gap-4
          sm:flex-row sm:items-start sm:justify-between
        "
      >
        <div>
          <h1 className="font-cinzel text-2xl tracking-wide text-(--cream)">
            {player.name}
          </h1>
          {player.tier === PlayerTier.Premium && (
            <Badge className="mt-2">Premium</Badge>
          )}
        </div>
        <div className="sm:self-center">
          <PlayerGamesModal player={player} games={games} />
        </div>
      </div>
    </div>
  )
}
