import Link from 'next/link'
import type { ReactNode } from 'react'
import { createGamesSearchParams } from '@/lib/games-page-filters'
import { GAMES_PAGE_SIZES, type GamesPageFilters, type GamesPageSize } from '@/lib/games-page-shared'

interface Props {
  page: number
  pageSize: GamesPageSize
  totalPages: number
  filters: GamesPageFilters
}

type PaginationSlot =
  | { type: 'page'; value: number }
  | { type: 'ellipsis'; key: string }
  | { type: 'placeholder'; key: string }

const PAGINATION_SLOT_COUNT = 7

function buildGamesHref(page: number, pageSize: GamesPageSize, filters: GamesPageFilters) {
  return `/games?${createGamesSearchParams({ page, pageSize, filters }).toString()}`
}

function getPaginationSlots(page: number, totalPages: number): PaginationSlot[] {
  if (totalPages <= 0) return []

  if (totalPages <= PAGINATION_SLOT_COUNT) {
    return Array.from({ length: PAGINATION_SLOT_COUNT }, (_unused, index) => {
      const value = index + 1

      return value <= totalPages
        ? { type: 'page', value }
        : { type: 'placeholder', key: `placeholder-${value}` }
    })
  }

  if (page <= 4) {
    return [
      { type: 'page', value: 1 },
      { type: 'page', value: 2 },
      { type: 'page', value: 3 },
      { type: 'page', value: 4 },
      { type: 'page', value: 5 },
      { type: 'ellipsis', key: 'ellipsis-end' },
      { type: 'page', value: totalPages },
    ]
  }

  if (page >= totalPages - 3) {
    return [
      { type: 'page', value: 1 },
      { type: 'ellipsis', key: 'ellipsis-start' },
      { type: 'page', value: totalPages - 4 },
      { type: 'page', value: totalPages - 3 },
      { type: 'page', value: totalPages - 2 },
      { type: 'page', value: totalPages - 1 },
      { type: 'page', value: totalPages },
    ]
  }

  return [
    { type: 'page', value: 1 },
    { type: 'ellipsis', key: 'ellipsis-start' },
    { type: 'page', value: page - 1 },
    { type: 'page', value: page },
    { type: 'page', value: page + 1 },
    { type: 'ellipsis', key: 'ellipsis-end' },
    { type: 'page', value: totalPages },
  ]
}

function PageLink({
  href,
  label,
  content,
}: {
  href: string
  label: string
  content: ReactNode
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="rounded border border-[var(--gold)]/30 px-3 py-1.5 text-xs text-[var(--cream)]/70 transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]"
    >
      {content}
    </Link>
  )
}

export function GamesPagination({ page, pageSize, totalPages, filters }: Props) {
  const paginationSlots = getPaginationSlots(page, totalPages)
  const showPager = totalPages > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--cream)]/60">
        <span className="tracking-widest uppercase text-[var(--cream)]/50">Show per page</span>
        {GAMES_PAGE_SIZES.map((size) => (
          <Link
            key={size}
            href={buildGamesHref(1, size, filters)}
            className={`rounded border px-3 py-1.5 transition-colors ${
              size === pageSize
                ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold)]'
                : 'border-[var(--gold)]/30 text-[var(--cream)]/70 hover:border-[var(--gold)] hover:text-[var(--gold)]'
            }`}
          >
            {size}
          </Link>
        ))}
      </div>

      {showPager && (
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          {page > 1 ? (
            <PageLink
              href={buildGamesHref(page - 1, pageSize, filters)}
              label="Previous"
              content={<span aria-hidden="true">←</span>}
            />
          ) : (
            <span
              aria-disabled="true"
              aria-label="Previous"
              className="rounded border border-[var(--gold)]/15 px-3 py-1.5 text-xs text-[var(--cream)]/30"
            >
              <span aria-hidden="true">←</span>
            </span>
          )}

          <div
            data-testid="games-pagination-strip"
            className="grid grid-cols-7 gap-2"
          >
            {paginationSlots.map((slot) => {
              if (slot.type === 'placeholder') {
                return (
                  <span
                    key={slot.key}
                    data-testid="games-pagination-slot"
                    data-slot-type="placeholder"
                    aria-hidden="true"
                    className="min-w-10 rounded border border-transparent px-3 py-1.5 text-xs invisible"
                  >
                    00
                  </span>
                )
              }

              if (slot.type === 'ellipsis') {
                return (
                  <span
                    key={slot.key}
                    data-testid="games-pagination-slot"
                    data-slot-type="ellipsis"
                    aria-hidden="true"
                    className="flex min-w-10 items-center justify-center px-3 py-1.5 text-xs text-[var(--cream)]/30"
                  >
                    ...
                  </span>
                )
              }

              return (
                <div
                  key={slot.value}
                  data-testid="games-pagination-slot"
                  data-slot-type="page"
                  className="flex min-w-10 justify-center"
                >
                  {slot.value === page ? (
                    <span
                      aria-current="page"
                      className="w-full rounded border border-[var(--gold)] bg-[var(--gold)]/10 px-3 py-1.5 text-center text-xs text-[var(--gold)]"
                    >
                      {slot.value}
                    </span>
                  ) : (
                    <PageLink
                      href={buildGamesHref(slot.value, pageSize, filters)}
                      label={String(slot.value)}
                      content={String(slot.value)}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {page < totalPages ? (
            <PageLink
              href={buildGamesHref(page + 1, pageSize, filters)}
              label="Next"
              content={<span aria-hidden="true">→</span>}
            />
          ) : (
            <span
              aria-disabled="true"
              aria-label="Next"
              className="rounded border border-[var(--gold)]/15 px-3 py-1.5 text-xs text-[var(--cream)]/30"
            >
              <span aria-hidden="true">→</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
