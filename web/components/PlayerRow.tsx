'use client'

import { Stepper } from './Stepper'

interface PlayerRowValue {
  playerId: number | null
  score: number | null
  isWinner: boolean
}

interface PlayerRowProps {
  value: PlayerRowValue
  onChange: (v: PlayerRowValue) => void
  players: { id: number; name: string; tier: string }[]
  selectedPlayerIds: number[]
}

export function PlayerRow({ value, onChange, players, selectedPlayerIds }: PlayerRowProps) {
  const premium = players.filter((p) => p.tier === 'premium')
  const standard = players.filter((p) => p.tier === 'standard')
  const selectedIds = new Set(selectedPlayerIds)

  const handlePlayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value ? Number(e.target.value) : null
    onChange({ ...value, playerId: id, score: id === null ? null : (value.score ?? 0) })
  }

  const isDisabledElsewhere = (playerId: number) =>
    selectedIds.has(playerId) && value.playerId !== playerId

  return (
    <div className="flex items-center gap-3 py-2">
      <select
        value={value.playerId?.toString() ?? ''}
        onChange={handlePlayerChange}
        className="flex-1 bg-[var(--navy-900)] border border-[var(--gold)] text-[var(--cream)] rounded px-2 py-1 text-sm"
      >
        <option value="">— select player —</option>
        {premium.length > 0 && (
          <optgroup label="Premium">
            {premium.map((p) => (
              <option
                key={p.id}
                value={p.id.toString()}
                disabled={isDisabledElsewhere(p.id)}
                className={isDisabledElsewhere(p.id) ? 'text-[var(--cream)]/40' : undefined}
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
                className={isDisabledElsewhere(p.id) ? 'text-[var(--cream)]/40' : undefined}
              >
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
      </select>

      <div className={value.playerId === null ? 'opacity-30 pointer-events-none' : ''}>
        <Stepper
          value={value.score ?? 0}
          onChange={(v) => onChange({ ...value, score: v })}
          min={0}
        />
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...value, isWinner: !value.isWinner })}
        disabled={value.playerId === null}
        className="text-xl disabled:opacity-30 transition-opacity"
        title={value.isWinner ? 'Remove winner' : 'Mark as winner'}
        aria-label={value.isWinner ? 'Remove winner' : 'Mark as winner'}
      >
        {value.isWinner ? '⭐' : '☆'}
      </button>
    </div>
  )
}
