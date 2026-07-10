import { FormattedDate } from './FormattedDate'

interface GameCardGame {
  id: number
  playedAt: Date
  notes: string
  players: { playerName: string; score: number; isWinner: boolean }[]
}

interface GameCardProps {
  game: GameCardGame
}

export function GameCard({ game }: GameCardProps) {
  const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score)

  return (
    <article
      className="
        rounded-xl border border-(--border-gold-subtle) bg-(--surface-subtle)
        p-4 backdrop-blur-sm
      "
    >
      <FormattedDate
        iso={game.playedAt.toISOString()}
        className="mb-3 block text-xs text-(--cream)/60"
      />

      <ul className="space-y-1.5">
        {sortedPlayers.map((player) => (
          <li
            key={player.playerName}
            className={`
              flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm
              ${
                player.isWinner
                  ? 'bg-(--gold)/10 font-semibold text-(--gold)'
                  : 'text-(--cream)/75'
              }
            `}
          >
            <span aria-hidden="true" className="w-4 text-center leading-none">
              {player.isWinner ? '♛' : ''}
            </span>
            <span>
              {player.playerName}
              {player.isWinner && <span className="sr-only"> (winner)</span>}
            </span>
            <span className="ml-auto tabular-nums">{player.score}</span>
          </li>
        ))}
      </ul>

      {game.notes && <p className="mt-3 text-xs text-(--cream)/45 italic">{game.notes}</p>}
    </article>
  )
}
