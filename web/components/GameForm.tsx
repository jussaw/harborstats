'use client'

import { useRef, useState } from 'react'
import type { Player } from '@/lib/players'
import type { GameActionResult } from '@/lib/games'
import { datetimeLocalToIso, isoToDatetimeLocal, nowDatetimeLocal } from '@/lib/dates'
import { PlayerRow } from './PlayerRow'

const NUM_ROWS = 8

export interface RowState {
  playerId: number | null
  score: number | null
  isWinner: boolean
}

interface FormRow extends RowState {
  id: string
}

export interface GameFormInitial {
  played_at: string
  notes: string
  rows: RowState[]
}

function emptyRow(): RowState {
  return { playerId: null, score: null, isWinner: false }
}

function createFormRow(index: number, row: RowState = emptyRow()): FormRow {
  return { id: `row-${index}`, ...row }
}

interface Props {
  action: (formData: FormData) => Promise<GameActionResult | void>
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
  const [playedAtLocal, setPlayedAtLocal] = useState<string>(() =>
    initial?.played_at ? isoToDatetimeLocal(initial.played_at) : nowDatetimeLocal(),
  )

  const [rows, setRows] = useState<FormRow[]>(() => {
    if (initial) {
      // NUM_ROWS is the minimum number of rows to show, not a cap: an existing
      // game may already have more participants and must never be truncated.
      const filledRows = initial.rows.map((row, index) => createFormRow(index, row))
      const emptyRows = Array.from(
        { length: Math.max(0, NUM_ROWS - filledRows.length) },
        (_, index) => createFormRow(filledRows.length + index),
      )
      return [...filledRows, ...emptyRows]
    }
    return Array.from({ length: NUM_ROWS }, (_, index) => createFormRow(index))
  })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  const updateRow = (rowId: string, nextRowState: RowState) =>
    setRows((prevRows) =>
      prevRows.map((row) => {
        if (row.id !== rowId) {
          return nextRowState.isWinner ? { ...row, isWinner: false } : row
        }

        return { ...row, ...nextRowState }
      }),
    )
  const selectedPlayerIds = rows
    .map((r) => r.playerId)
    .filter((id): id is number => id !== null)

  async function handleSubmit(formData: FormData) {
    if (isSubmittingRef.current) {
      return
    }

    setError(null)

    const invalidRowIndex = rows.findIndex(
      ({ playerId, score }) => (playerId === null) !== (score === null),
    )
    if (invalidRowIndex !== -1) {
      setError(`Row ${invalidRowIndex + 1}: name and score must both be filled or both empty.`)
      return
    }

    const filledRows = rows.filter((row): row is FormRow & { playerId: number } => row.playerId !== null)
    if (filledRows.length === 0) {
      setError('Add at least one player before submitting.')
      return
    }

    const seenPlayerIds = new Set<number>()
    const hasDuplicatePlayer = filledRows.some(({ playerId }) => {
      if (seenPlayerIds.has(playerId)) return true
      seenPlayerIds.add(playerId)
      return false
    })
    if (hasDuplicatePlayer) {
      setError('Each player can only be selected once per game.')
      return
    }

    formData.set('played_at', datetimeLocalToIso(formData.get('played_at') as string))

    rows.forEach((r, i) => {
      formData.set(`player_id_${i}`, r.playerId?.toString() ?? '')
      formData.set(`score_${i}`, r.score?.toString() ?? '')
      formData.set(`is_winner_${i}`, r.isWinner ? '1' : '0')
    })

    isSubmittingRef.current = true
    if (submitButtonRef.current) {
      submitButtonRef.current.disabled = true
    }
    setIsSubmitting(true)
    try {
      const result = await action(formData)
      if (result && !result.ok) {
        setError(result.error ?? 'Something went wrong saving the game. Please try again.')
        return
      }
      onSuccess?.()
    } finally {
      isSubmittingRef.current = false
      if (submitButtonRef.current) {
        submitButtonRef.current.disabled = false
      }
      setIsSubmitting(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {hiddenFields &&
        Object.entries(hiddenFields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      {error && (
        <p role="alert" className="
          rounded-lg border border-red-400 bg-red-900/30 px-4 py-2 text-sm
          text-red-300
        ">
          {error}
        </p>
      )}

      <div className="space-y-1">
        {/*
          We pass the selected player ids so each row can disable players already
          chosen on other rows while keeping the current row selection enabled.
        */}
        {rows.map((row) => (
          <PlayerRow
            key={row.id}
            value={row}
            onChange={(nextRowState) => updateRow(row.id, nextRowState)}
            players={players}
            selectedPlayerIds={selectedPlayerIds}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="
            flex flex-col gap-1 text-xs font-medium text-(--cream)/70
          " htmlFor="played_at">
            <span>Date &amp; Time</span>
            <input
              id="played_at"
              name="played_at"
              type="datetime-local"
              value={playedAtLocal}
              onChange={(e) => setPlayedAtLocal(e.target.value)}
              required
              // The initial value renders in the server's timezone during SSR
              // but is recomputed in the browser's timezone on hydration; the
              // client value is the correct one.
              suppressHydrationWarning
              className="
                rounded-lg border border-(--border-gold) bg-(--navy-950)/60 px-3
                py-1.5 text-sm text-(--cream) scheme-dark
                focus:border-(--gold) focus:ring-2 focus:ring-(--gold)/30
                focus:outline-none
              "
            />
          </label>
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="
            flex flex-col gap-1 text-xs font-medium text-(--cream)/70
          " htmlFor="notes">
            <span>Notes</span>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={initial?.notes ?? ''}
              className="
                resize-none rounded-lg border border-(--border-gold)
                bg-(--navy-950)/60 px-3 py-1.5 text-sm text-(--cream)
                focus:border-(--gold) focus:ring-2 focus:ring-(--gold)/30
                focus:outline-none
              "
            />
          </label>
        </div>
      </div>

      <button
        ref={submitButtonRef}
        type="submit"
        disabled={isSubmitting}
        className="
          w-full rounded-lg border border-(--gold-600)
          bg-(image:--gradient-gold) px-6 py-3 text-sm font-semibold
          text-(--navy-900) shadow-[0_6px_16px_rgb(232_178_58/0.25)]
          transition-all
          hover:brightness-110
          disabled:cursor-not-allowed disabled:opacity-60
        "
      >
        {submitLabel}
      </button>
    </form>
  )
}
