'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { PlayerTier } from '@/lib/player-tier'

interface PlayerOption {
  id: number
  name: string
  tier: PlayerTier
}

interface PlayerSelectProps {
  players: PlayerOption[]
  value: number | null
  selectedPlayerIds: number[]
  onChange: (playerId: number | null) => void
}

interface PlayerGroup {
  label: string
  players: PlayerOption[]
}

function getEnabledVisiblePlayerIds(
  groups: PlayerGroup[],
  selectedIds: Set<number>,
  value: number | null,
) {
  return groups
    .flatMap((group) => group.players)
    .filter((player) => !selectedIds.has(player.id) || value === player.id)
    .map((player) => player.id)
}

function getPreferredHighlightedId(
  enabledPlayerIds: number[],
  value: number | null,
  current: number | null,
) {
  if (enabledPlayerIds.length === 0) {
    return null
  }

  if (current !== null && enabledPlayerIds.includes(current)) {
    return current
  }

  if (value !== null && enabledPlayerIds.includes(value)) {
    return value
  }

  return enabledPlayerIds[0] ?? null
}

function getGroupedPlayers(players: PlayerOption[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()
  const matchesQuery = (player: PlayerOption) =>
    normalizedQuery.length === 0 || player.name.toLowerCase().includes(normalizedQuery)

  const groups: PlayerGroup[] = [
    {
      label: 'Premium',
      players: players.filter((player) => player.tier === PlayerTier.Premium && matchesQuery(player)),
    },
    {
      label: 'Standard',
      players: players.filter((player) => player.tier === PlayerTier.Standard && matchesQuery(player)),
    },
  ]

  return groups.filter((group) => group.players.length > 0)
}

export function PlayerSelect({ players, value, selectedPlayerIds, onChange }: PlayerSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selectedIds = useMemo(() => new Set(selectedPlayerIds), [selectedPlayerIds])
  const selectedPlayer = players.find((player) => player.id === value) ?? null
  const groups = useMemo(() => getGroupedPlayers(players, query), [players, query])

  const enabledVisiblePlayerIds = useMemo(
    () => getEnabledVisiblePlayerIds(groups, selectedIds, value),
    [groups, selectedIds, value],
  )
  const [highlightedId, setHighlightedId] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    const frame = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => cancelAnimationFrame(frame)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [isOpen])

  const moveHighlight = (direction: 1 | -1) => {
    if (enabledVisiblePlayerIds.length === 0) return

    if (highlightedId === null) {
      setHighlightedId(enabledVisiblePlayerIds[0] ?? null)
      return
    }

    const currentIndex = enabledVisiblePlayerIds.indexOf(highlightedId)
    const nextIndex =
      currentIndex === -1
        ? 0
        : (currentIndex + direction + enabledVisiblePlayerIds.length) % enabledVisiblePlayerIds.length

    setHighlightedId(enabledVisiblePlayerIds[nextIndex] ?? null)
  }

  const handleSelect = (playerId: number | null) => {
    onChange(playerId)
    setIsOpen(false)
    setQuery('')
  }

  const openPicker = () => {
    const nextGroups = getGroupedPlayers(players, '')
    const nextEnabledPlayerIds = getEnabledVisiblePlayerIds(nextGroups, selectedIds, value)

    setQuery('')
    setHighlightedId((current) => getPreferredHighlightedId(nextEnabledPlayerIds, value, current))
    setIsOpen(true)
  }

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveHighlight(1)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveHighlight(-1)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      if (highlightedId !== null) {
        handleSelect(highlightedId)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative flex-1">
      <button
        type="button"
        role="combobox"
        aria-label="Player"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false)
            return
          }

          openPicker()
        }}
        onKeyDown={handleTriggerKeyDown}
        className="
          flex w-full items-center justify-between rounded-sm border
          border-(--gold) bg-(--navy-900) px-2 py-1 text-sm text-(--cream)
        "
      >
        <span className={selectedPlayer ? '' : 'text-(--cream)/55'}>
          {selectedPlayer?.name ?? '— select player —'}
        </span>
        <span className="ml-2 text-xs text-(--cream)/60">{isOpen ? 'Hide' : 'Show'}</span>
      </button>

      {isOpen && (
        <div className="
          absolute inset-x-0 top-full z-20 mt-1 space-y-2 rounded-sm border
          border-(--gold) bg-(--navy-900) p-2 shadow-lg
        ">
          <input
            ref={inputRef}
            aria-label="Player"
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value
              const nextGroups = getGroupedPlayers(players, nextQuery)
              const nextEnabledPlayerIds = getEnabledVisiblePlayerIds(nextGroups, selectedIds, value)

              setQuery(nextQuery)
              setHighlightedId((current) =>
                getPreferredHighlightedId(nextEnabledPlayerIds, value, current),
              )
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type to search players"
            className="
              w-full rounded-sm border border-(--gold)/40 bg-(--navy-800) px-2
              py-1 text-sm text-(--cream)
            "
          />

          {value !== null && (
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="
                text-xs tracking-[0.18em] text-(--cream)/55 uppercase
                transition-colors
                hover:text-(--gold)
              "
            >
              Clear player
            </button>
          )}

          <div
            id={listboxId}
            role="listbox"
            className="max-h-56 space-y-2 overflow-y-auto"
          >
            {groups.length === 0 ? (
              <p className="px-2 py-3 text-sm text-(--cream)/55">No players found</p>
            ) : (
              groups.map((group) => (
                <div
                  key={group.label}
                  role="group"
                  aria-label={group.label}
                  className="space-y-1"
                >
                  <p className="
                    px-2 text-xs tracking-[0.18em] text-(--cream)/45 uppercase
                  ">
                    {group.label}
                  </p>
                  {group.players.map((player) => {
                    const isDisabled = selectedIds.has(player.id) && value !== player.id
                    const isSelected = value === player.id
                    const isHighlighted = highlightedId === player.id

                    return (
                      <button
                        key={player.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        disabled={isDisabled}
                        onMouseEnter={() => !isDisabled && setHighlightedId(player.id)}
                        onClick={() => handleSelect(player.id)}
                        className={`
                          flex w-full items-center justify-between rounded-sm
                          px-2 py-1.5 text-left text-sm transition-colors
                          ${
                            isHighlighted
                              ? 'bg-(--gold)/15 text-(--gold)'
                              : 'text-(--cream)'
                          }
                          ${
                            isDisabled
                              ? 'cursor-not-allowed opacity-35'
                              : 'hover:bg-(--gold)/10'
                          }
                        `}
                      >
                        <span>{player.name}</span>
                        {isSelected && (
                          <span aria-hidden="true" className="
                            text-xs text-(--gold)
                          ">
                            Selected
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
