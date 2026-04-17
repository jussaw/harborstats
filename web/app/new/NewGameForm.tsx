'use client'

import { useRef, useState } from 'react'
import { PlayerRow } from '@/components/PlayerRow'
import { createGameAction } from '@/app/actions'

const NUM_ROWS = 8

type RowState = { playerId: number | null; score: number | null; isWinner: boolean }

function defaultRow(): RowState {
  return { playerId: null, score: null, isWinner: false }
}

function nowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface Props {
  players: { id: number; name: string; tier: string }[]
}

export function NewGameForm({ players }: Props) {
  const [rows, setRows] = useState<RowState[]>(() => Array.from({ length: NUM_ROWS }, defaultRow))
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const updateRow = (i: number, val: RowState) => {
    setRows((prev) => prev.map((r, idx) => (idx === i ? val : r)))
  }

  async function handleSubmit(formData: FormData) {
    setError(null)

    for (let i = 0; i < rows.length; i++) {
      const { playerId, score } = rows[i]
      const hasPlayer = playerId !== null
      const hasScore = score !== null
      if (hasPlayer !== hasScore) {
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

    await createGameAction(formData)
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-6">
      {error && (
        <p className="rounded border border-red-400 bg-red-900/30 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="space-y-1">
        {rows.map((row, i) => (
          <PlayerRow key={i} value={row} onChange={(v) => updateRow(i, v)} players={players} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--cream)] opacity-70" htmlFor="played_at">
            Date &amp; Time
          </label>
          <input
            id="played_at"
            name="played_at"
            type="datetime-local"
            defaultValue={nowLocal()}
            required
            className="rounded border border-[var(--gold)] bg-[var(--navy-900)] px-3 py-1.5 text-sm text-[var(--cream)] [color-scheme:dark]"
          />
        </div>
        <div className="flex flex-col gap-1 col-span-2">
          <label className="text-xs text-[var(--cream)] opacity-70" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="rounded border border-[var(--gold)] bg-[var(--navy-900)] px-3 py-1.5 text-sm text-[var(--cream)] resize-none"
          />
        </div>
      </div>

      <button
        type="submit"
        className="font-cinzel w-full rounded border border-[var(--gold)] bg-[var(--gold)] px-6 py-3 text-[var(--navy-900)] font-semibold tracking-wide hover:bg-[var(--cream)] transition-colors"
      >
        Save Game
      </button>
    </form>
  )
}
