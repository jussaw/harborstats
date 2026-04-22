'use client'

import { PlayerTier } from '@/lib/player-tier'
import { PlayerSelect } from './PlayerSelect'

interface PlayerRowValue {
  playerId: number | null
  score: number | null
  isWinner: boolean
}

interface PlayerRowProps {
  value: PlayerRowValue
  onChange: (v: PlayerRowValue) => void
  players: { id: number; name: string; tier: PlayerTier }[]
  selectedPlayerIds: number[]
}

const SCORE_OPTIONS = Array.from({ length: 21 }, (_unused, score) => score)

function getScoreOptions(score: number | null) {
  if (score !== null && score > 20) {
    return [...SCORE_OPTIONS, score]
  }

  return SCORE_OPTIONS
}

export function PlayerRow({ value, onChange, players, selectedPlayerIds }: PlayerRowProps) {
  const scoreOptions = getScoreOptions(value.score)

  const handleScoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, score: Number(e.target.value) })
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <PlayerSelect
        players={players}
        value={value.playerId}
        selectedPlayerIds={selectedPlayerIds}
        onChange={(playerId) =>
          onChange({
            ...value,
            playerId,
            score: playerId === null ? null : (value.score ?? 0),
          })
        }
      />

      <div className={value.playerId === null ? 'pointer-events-none opacity-30' : ''}>
        <select
          aria-label="Score"
          value={(value.score ?? 0).toString()}
          onChange={handleScoreChange}
          disabled={value.playerId === null}
          className="
            w-20 rounded-sm border border-(--gold) bg-(--navy-900) px-2 py-1
            text-sm text-(--cream)
          "
        >
          {scoreOptions.map((score) => (
            <option key={score} value={score.toString()}>
              {score}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...value, isWinner: !value.isWinner })}
        disabled={value.playerId === null}
        className={`
          text-xl transition-opacity
          disabled:opacity-30
          ${value.isWinner ? '' : 'text-(--gold)'}
        `}
        title={value.isWinner ? 'Remove winner' : 'Mark as winner'}
        aria-label={value.isWinner ? 'Remove winner' : 'Mark as winner'}
      >
        {value.isWinner ? '⭐' : '☆'}
      </button>
    </div>
  )
}
