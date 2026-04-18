'use client'

import { useState } from 'react'
import type { Player } from '@/lib/players'
import { PlayerRow } from './PlayerRow'

const NUM_ROWS = 8

export interface RowState {
  playerId: number | null
  score: number | null
  isWinner: boolean
}

export interface GameFormInitial {
  played_at: string
  notes: string
  rows: RowState[]
}

function emptyRow(): RowState {
  return { playerId: null, score: null, isWinner: false }
}

function nowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  action: (formData: FormData) => Promise<void>
  players: Player[]
  initial?: GameFormInitial
  submitLabel?: string
  hiddenFields?: Record<string, string>
  onSuccess?: () => void
}

export function GameForm({
  action,
  players,
  initial,
  submitLabel = 'Save Game',
  hiddenFields,
  onSuccess,
}: Props) {
  const [rows, setRows] = useState<RowState[]>(() => {
    if (initial) {
      const filled = initial.rows.slice(0, NUM_ROWS)
      return [...filled, ...Array(Math.max(0, NUM_ROWS - filled.length)).fill(null).map(emptyRow)]
    }
    return Array.from({ length: NUM_ROWS }, emptyRow)
  })
  const [error, setError] = useState<string | null>(null)

  const updateRow = (i: number, val: RowState) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? val : r)))

  async function handleSubmit(formData: FormData) {
    setError(null)

    for (let i = 0; i < rows.length; i += 1) {
      const { playerId, score } = rows[i]
      if ((playerId === null) !== (score === null)) {
        setError(`Row ${i + 1}: name and score must both be filled or both empty.`)
        return
      }
    }

    const filledRows = rows.filter((r) => r.playerId !== null)
    if (filledRows.length === 0) {
      setError('Add at least one player before submitting.')
      return
    }

    rows.forEach((r, i) => {
      formData.set(`player_id_${i}`, r.playerId?.toString() ?? '')
      formData.set(`score_${i}`, r.score?.toString() ?? '')
      formData.set(`is_winner_${i}`, r.isWinner ? '1' : '0')
    })

    await action(formData)
    onSuccess?.()
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      {error && (
        <p className="rounded border border-red-400 bg-red-900/30 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-1">
        {/* eslint-disable-next-line react/no-array-index-key */}
        {rows.map((row, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <PlayerRow key={i} value={row} onChange={(v) => updateRow(i, v)} players={players} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="text-xs text-[var(--cream)] opacity-70" htmlFor="played_at">
            Date &amp; Time
          </label>
          <input
            id="played_at"
            name="played_at"
            type="datetime-local"
            defaultValue={initial?.played_at ?? nowLocal()}
            required
            className="rounded border border-[var(--gold)] bg-[var(--navy-900)] px-3 py-1.5 text-sm text-[var(--cream)] [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="text-xs text-[var(--cream)] opacity-70" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={initial?.notes ?? ''}
            className="rounded border border-[var(--gold)] bg-[var(--navy-900)] px-3 py-1.5 text-sm text-[var(--cream)] resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        className="font-cinzel w-full rounded border border-[var(--gold)] bg-[var(--gold)] px-6 py-3 text-[var(--navy-900)] font-semibold tracking-wide hover:bg-[var(--cream)] transition-colors"
      >
        {submitLabel}
      </button>
    </form>
  )
}

GameForm.defaultProps = {
  initial: undefined,
  submitLabel: 'Save Game',
  hiddenFields: undefined,
  onSuccess: undefined,
}
