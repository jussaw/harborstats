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
  const winners = sortedPlayers.filter((player) => player.isWinner)

  return (
    <article
      className="
        rounded-xl border border-(--border-gold-subtle) bg-(--surface-subtle)
        p-4 backdrop-blur-sm
      "
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <FormattedDate iso={game.playedAt.toISOString()} className="
          text-xs text-(--cream)/60
        " />
        {winners.length > 0 && (
          <p className="text-xs font-semibold text-(--gold)">
            ♛ {winners.map((winner) => winner.playerName).join(', ')}
          </p>
        )}
      </div>

      <ul className="flex flex-wrap gap-2">
        {sortedPlayers.map((player) => (
          <li
            key={player.playerName}
            className={`
              inline-flex items-center gap-1.5 rounded-full border px-3 py-1
              text-xs
              ${
                player.isWinner
                  ? `
                    border-(--border-gold) bg-(--gold)/15 font-semibold
                    text-(--gold)
                  `
                  : 'border-(--cream)/15 bg-(--cream)/5 text-(--cream)/75'
              }
            `}
          >
            <span>{player.playerName}</span>
            <span className="tabular-nums">{player.score}</span>
          </li>
        ))}
      </ul>

      {game.notes && <p className="mt-3 text-xs text-(--cream)/45 italic">{game.notes}</p>}
    </article>
  )
}
