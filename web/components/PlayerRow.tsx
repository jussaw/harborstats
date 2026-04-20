'use client'

import { PlayerTier } from '@/lib/player-tier'

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
  const premium = players.filter((p) => p.tier === PlayerTier.Premium)
  const standard = players.filter((p) => p.tier === PlayerTier.Standard)
  const selectedIds = new Set(selectedPlayerIds)
  const scoreOptions = getScoreOptions(value.score)

  const handlePlayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null
    onChange({ ...value, playerId: id, score: id === null ? null : (value.score ?? 0) })
  }

  const handleScoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...value, score: Number(e.target.value) })
  }

  const isDisabledElsewhere = (playerId: number) =>
    selectedIds.has(playerId) && value.playerId !== playerId

  return (
    <div className="flex items-center gap-3 py-2">
      <select
        aria-label="Player"
        value={value.playerId?.toString() ?? ''}
        onChange={handlePlayerChange}
        className="
          flex-1 rounded-sm border border-(--gold) bg-(--navy-900) px-2 py-1
          text-sm text-(--cream)
        "
      >
        <option value="">— select player —</option>
        {premium.length > 0 && (
          <optgroup label="Premium">
            {premium.map((p) => (
              <option
                key={p.id}
                value={p.id.toString()}
                disabled={isDisabledElsewhere(p.id)}
                className={isDisabledElsewhere(p.id) ? 'text-(--cream)/40' : undefined}
              >
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
        {standard.length > 0 && (
          <optgroup label="Standard">
            {standard.map((p) => (
              <option
                key={p.id}
                value={p.id.toString()}
                disabled={isDisabledElsewhere(p.id)}
                className={isDisabledElsewhere(p.id) ? 'text-(--cream)/40' : undefined}
              >
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

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
        className="
          text-xl transition-opacity
          disabled:opacity-30
        "
        title={value.isWinner ? 'Remove winner' : 'Mark as winner'}
        aria-label={value.isWinner ? 'Remove winner' : 'Mark as winner'}
      >
        {value.isWinner ? '⭐' : '☆'}
      </button>
    </div>
  )
}
