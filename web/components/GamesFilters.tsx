'use client'

import { useId, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createGamesSearchParams } from '@/lib/games-page-filters'
import type { GamesPageFilters, GamesPageSize } from '@/lib/games-page-shared'
import { datetimeLocalToIso, isoToDatetimeLocal } from '@/lib/dates'
import type { Player } from '@/lib/players'

interface Props {
  players: Player[]
  pageSize: GamesPageSize
  filters: GamesPageFilters
}

function countActiveFilters(filters: GamesPageFilters) {
  let count = 0
  if (filters.playerIds.length > 0) count += 1
  if (filters.from) count += 1
  if (filters.to) count += 1
  return count
}

function getPlayersSummary(selectedPlayerIds: number[]) {
  if (selectedPlayerIds.length === 0) return 'All players'
  if (selectedPlayerIds.length === 1) return '1 player selected'
  return `${selectedPlayerIds.length} players selected`
}

function parseLocalDateValue(value: string) {
  if (!value) return null
  const parsed = new Date(datetimeLocalToIso(value))
  return Number.isNaN(parsed.valueOf()) ? null : parsed
}

export function GamesFilters({ players, pageSize, filters }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [isPlayersOpen, setIsPlayersOpen] = useState(false)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>(filters.playerIds)
  const [fromLocal, setFromLocal] = useState(filters.from ? isoToDatetimeLocal(filters.from.toISOString()) : '')
  const [toLocal, setToLocal] = useState(filters.to ? isoToDatetimeLocal(filters.to.toISOString()) : '')
  const drawerId = useId()

  function replaceWithFilters(nextFilters: GamesPageFilters) {
    const nextSearch = createGamesSearchParams({
      page: 1,
      pageSize,
      filters: nextFilters,
    }).toString()

    startTransition(() => {
      router.replace(`${pathname}?${nextSearch}`)
    })
  }

  function getCurrentDateFilters() {
    return {
      from: parseLocalDateValue(fromLocal),
      to: parseLocalDateValue(toLocal),
    }
  }

  function togglePlayer(playerId: number) {
    const nextPlayerIds = selectedPlayerIds.includes(playerId)
      ? selectedPlayerIds.filter((selectedId) => selectedId !== playerId)
      : [...selectedPlayerIds, playerId]

    setSelectedPlayerIds(nextPlayerIds)
    replaceWithFilters({
      playerIds: nextPlayerIds,
      ...getCurrentDateFilters(),
    })
  }

  function clearPlayers() {
    setSelectedPlayerIds([])
    replaceWithFilters({
      playerIds: [],
      ...getCurrentDateFilters(),
    })
  }

  function commitDateFilters() {
    replaceWithFilters({
      playerIds: selectedPlayerIds,
      ...getCurrentDateFilters(),
    })
  }

  const activeFilterCount = countActiveFilters({
    playerIds: selectedPlayerIds,
    ...getCurrentDateFilters(),
  })

  return (
    <section className="space-y-3 rounded-xl border border-[var(--gold)]/20 bg-[var(--navy-900)]/40 p-4" aria-busy={isPending}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls={drawerId}
          className="inline-flex items-center gap-2 rounded border border-[var(--gold)]/40 px-3 py-2 text-sm text-[var(--cream)] transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]"
        >
          <span className="tracking-wide">Filters</span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-[var(--gold)]/10 px-2 py-0.5 text-xs text-[var(--gold)]">
              {activeFilterCount}
            </span>
          )}
        </button>

        <p className="text-xs text-[var(--cream)]/55">
          {selectedPlayerIds.length === 0 ? 'All players included' : getPlayersSummary(selectedPlayerIds)}
        </p>
      </div>

      {isOpen && (
        <div id={drawerId} className="grid gap-4 border-t border-[var(--gold)]/15 pt-4 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--cream)]/55">Players</p>
            <div className="space-y-2">
              <button
                id="games-players-filter"
                type="button"
                aria-label="Players"
                aria-expanded={isPlayersOpen}
                onClick={() => setIsPlayersOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded border border-[var(--gold)]/30 bg-[var(--navy-900)] px-3 py-2 text-sm text-[var(--cream)] transition-colors hover:border-[var(--gold)]"
              >
                <span>{getPlayersSummary(selectedPlayerIds)}</span>
                <span className="text-xs text-[var(--cream)]/50">{isPlayersOpen ? 'Hide' : 'Show'}</span>
              </button>

              {isPlayersOpen && (
                <div className="max-h-56 space-y-2 overflow-y-auto rounded border border-[var(--gold)]/20 bg-[var(--navy-900)]/80 p-3">
                  {players.map((player) => {
                    const isChecked = selectedPlayerIds.includes(player.id)

                    return (
                      <div key={player.id} className="flex items-center gap-2 text-sm text-[var(--cream)]">
                        <input
                          type="checkbox"
                          aria-label={player.name}
                          checked={isChecked}
                          onChange={() => togglePlayer(player.id)}
                          className="h-4 w-4 rounded border-[var(--gold)]/40 bg-[var(--navy-900)] text-[var(--gold)]"
                        />
                        <span>{player.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={clearPlayers}
                className="text-xs uppercase tracking-[0.18em] text-[var(--cream)]/55 transition-colors hover:text-[var(--gold)]"
              >
                Clear players
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--cream)]/55">From</p>
            <input
              id="games-filter-from"
              aria-label="From"
              type="datetime-local"
              value={fromLocal}
              onChange={(event) => setFromLocal(event.target.value)}
              onBlur={commitDateFilters}
              className="w-full rounded border border-[var(--gold)]/30 bg-[var(--navy-900)] px-3 py-2 text-sm text-[var(--cream)] [color-scheme:dark]"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--cream)]/55">To</p>
            <input
              id="games-filter-to"
              aria-label="To"
              type="datetime-local"
              value={toLocal}
              onChange={(event) => setToLocal(event.target.value)}
              onBlur={commitDateFilters}
              className="w-full rounded border border-[var(--gold)]/30 bg-[var(--navy-900)] px-3 py-2 text-sm text-[var(--cream)] [color-scheme:dark]"
            />
          </div>
        </div>
      )}
    </section>
  )
}
