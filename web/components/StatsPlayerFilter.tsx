'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { createStatsSearchParams } from '@/lib/stats-page-filters'
import type { Player } from '@/lib/players'

interface Props {
  players: Player[]
  selectedPlayerIds: number[]
}

function sameIdSet(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((id) => setB.has(id))
}

function getSummary(selectedCount: number, totalCount: number) {
  if (totalCount === 0) return 'No players'
  if (selectedCount >= totalCount) return 'All players'
  if (selectedCount === 0) return 'No players selected'
  return `${selectedCount} of ${totalCount} players`
}

export function StatsPlayerFilter({ players, selectedPlayerIds }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  // Optimistic selection while the server re-renders; reconciled back to the prop once the
  // navigation lands (the URL is the source of truth).
  const [draftSelection, setDraftSelection] = useState<number[] | null>(null)
  const drawerId = useId()
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  const allPlayerIds = players.map((player) => player.id)
  const activeSelection =
    draftSelection && !sameIdSet(draftSelection, selectedPlayerIds)
      ? draftSelection
      : selectedPlayerIds

  function commitSelection(nextSelection: number[]) {
    setDraftSelection(nextSelection)
    const search = createStatsSearchParams(nextSelection, allPlayerIds).toString()

    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname)
    })
  }

  function togglePlayer(playerId: number) {
    const nextSelection = activeSelection.includes(playerId)
      ? activeSelection.filter((selectedId) => selectedId !== playerId)
      : [...activeSelection, playerId]

    commitSelection(nextSelection)
  }

  function selectAll() {
    commitSelection([...allPlayerIds])
  }

  function selectNone() {
    commitSelection([])
  }

  const summary = getSummary(activeSelection.length, players.length)
  const hasSubset =
    players.length > 0 && activeSelection.length !== players.length

  return (
    <section ref={rootRef} className="relative shrink-0" aria-busy={isPending}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={drawerId}
        className="
          inline-flex items-center gap-2 rounded-lg border
          border-(--border-gold) px-3 py-2 text-sm text-(--cream)
          transition-colors
          hover:border-(--gold) hover:text-(--gold)
        "
      >
        <span className="tracking-wide">Players</span>
        {hasSubset ? (
          <span className="text-xs text-(--gold) tabular-nums">
            {activeSelection.length}/{players.length}
          </span>
        ) : null}
        <ChevronDown
          className={`
            size-4 text-(--cream)/50 transition-transform
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>

      {isOpen && (
        <div
          id={drawerId}
          className="
            absolute top-full left-0 z-20 mt-2 w-80 max-w-[calc(100vw-2rem)]
            space-y-3 rounded-2xl border border-(--border-gold-subtle)
            bg-(--navy-900)/95 p-3 shadow-(--shadow-card) backdrop-blur-sm
          "
        >
          <p className="text-xs text-(--cream)/55">{summary}</p>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={selectAll}
              className="
                text-xs tracking-[0.18em] text-(--cream)/55 uppercase
                transition-colors
                hover:text-(--gold)
              "
            >
              Select all
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="
                text-xs tracking-[0.18em] text-(--cream)/55 uppercase
                transition-colors
                hover:text-(--gold)
              "
            >
              Select none
            </button>
          </div>

          <div
            className="
              grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-lg border
              border-(--border-gold-subtle) bg-(--navy-950)/90 p-3
              sm:grid-cols-2
            "
          >
            {players.map((player) => {
              const isChecked = activeSelection.includes(player.id)

              return (
                <div
                  key={player.id}
                  className="flex items-center gap-2 text-sm text-(--cream)"
                >
                  <input
                    type="checkbox"
                    aria-label={player.name}
                    checked={isChecked}
                    onChange={() => togglePlayer(player.id)}
                    className="
                      size-4 rounded-sm border-(--border-gold) bg-(--navy-950)
                      accent-(--gold)
                    "
                  />
                  <span>{player.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
