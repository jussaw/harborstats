import Link from 'next/link'
import { GAMES_PAGE_SIZES, type GamesPageSize } from '@/lib/games'

interface Props {
  page: number
  pageSize: GamesPageSize
  totalPages: number
}

function buildGamesHref(page: number, pageSize: GamesPageSize) {
  return `/games?page=${page}&pageSize=${pageSize}`
}

function getVisiblePages(page: number, totalPages: number) {
  return [...new Set([1, page - 1, page, page + 1, totalPages])].filter(
    (value) => value >= 1 && value <= totalPages,
  )
}

function PageLink({
  href,
  label,
}: {
  href: string
  label: string
}) {
  return (
    <Link
      href={href}
      className="rounded border border-[var(--gold)]/30 px-3 py-1.5 text-xs text-[var(--cream)]/70 transition-colors hover:border-[var(--gold)] hover:text-[var(--gold)]"
    >
      {label}
    </Link>
  )
}

export function GamesPagination({ page, pageSize, totalPages }: Props) {
  const visiblePages = getVisiblePages(page, totalPages)
  const showPager = totalPages > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--cream)]/60">
        <span className="tracking-widest uppercase text-[var(--cream)]/50">Show per page</span>
        {GAMES_PAGE_SIZES.map((size) => (
          <Link
            key={size}
            href={buildGamesHref(1, size)}
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
        <div className="flex flex-wrap items-center gap-2">
          {page > 1 ? (
            <PageLink href={buildGamesHref(page - 1, pageSize)} label="Previous" />
          ) : (
            <span
              aria-disabled="true"
              className="rounded border border-[var(--gold)]/15 px-3 py-1.5 text-xs text-[var(--cream)]/30"
            >
              Previous
            </span>
          )}

          {visiblePages.map((visiblePage, index) => {
            const previousPage = visiblePages[index - 1]
            const needsEllipsis = previousPage !== undefined && visiblePage - previousPage > 1

            return (
              <div key={visiblePage} className="flex items-center gap-2">
                {needsEllipsis && <span className="px-1 text-xs text-[var(--cream)]/30">...</span>}
                {visiblePage === page ? (
                  <span
                    aria-current="page"
                    className="rounded border border-[var(--gold)] bg-[var(--gold)]/10 px-3 py-1.5 text-xs text-[var(--gold)]"
                  >
                    {visiblePage}
                  </span>
                ) : (
                  <PageLink href={buildGamesHref(visiblePage, pageSize)} label={String(visiblePage)} />
                )}
              </div>
            )
          })}

          {page < totalPages ? (
            <PageLink href={buildGamesHref(page + 1, pageSize)} label="Next" />
          ) : (
            <span
              aria-disabled="true"
              className="rounded border border-[var(--gold)]/15 px-3 py-1.5 text-xs text-[var(--cream)]/30"
            >
              Next
            </span>
          )}
        </div>
      )}
    </div>
  )
}
