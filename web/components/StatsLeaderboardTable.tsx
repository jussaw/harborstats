'use client'

import { useMemo, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { rankWithTies } from '@/lib/rank'

type SortDirection = 'asc' | 'desc'
type SortType = 'number' | 'string'
type SortValue = number | string | null

export interface StatsTableColumn {
  label: string
  align?: 'left' | 'center' | 'right'
  widthClass?: string
  // Marks the leading "#"/👑 column that the table renders and renumbers itself.
  rank?: boolean
  // When present the header is clickable and sorts rows by this key.
  sortKey?: string
  sortType?: SortType
  // First-click direction; defaults to 'desc' for numbers and 'asc' for strings.
  defaultDirection?: SortDirection
}

export interface StatsTableRow {
  key: string | number
  // The <td> cells for this row, excluding the rank cell (the table renders that).
  cells: ReactNode
  // Comparable values keyed by each sortable column's sortKey.
  sortValues?: Record<string, SortValue>
  // Sorts (and ranks) after all unpinned rows for every sort column and direction.
  pinBottom?: boolean
}

interface Props {
  columns: StatsTableColumn[]
  rows: StatsTableRow[]
  initialSort?: { key: string; direction: SortDirection }
  rowVariant?: 'default' | 'subtle'
  // Rendered as a single spanning cell when there are no rows (loading/empty states).
  emptyState?: ReactNode
}

const ROW_VARIANT_CLASS: Record<NonNullable<Props['rowVariant']>, string> = {
  default: `
    border-b border-(--border-gold-subtle) bg-(--surface-subtle)
    transition-colors
    last:border-0
    hover:bg-(--gold)/5
  `,
  subtle: `
    border-b border-(--gold)/10 bg-(--navy-900)/35 transition-colors
    last:border-0
    hover:bg-(--navy-900)/70
  `,
}

function getAlignmentClass(align: StatsTableColumn['align']) {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

function getAriaSort(
  isSortable: boolean,
  isActive: boolean,
  direction: SortDirection | undefined,
): 'ascending' | 'descending' | 'none' | undefined {
  if (!isSortable) return undefined
  if (!isActive) return 'none'
  return direction === 'asc' ? 'ascending' : 'descending'
}

function compareValues(a: SortValue, b: SortValue, type: SortType, direction: SortDirection) {
  const aMissing = a === null || a === undefined
  const bMissing = b === null || b === undefined
  if (aMissing && bMissing) return 0
  // Missing values always sort to the bottom, regardless of direction.
  if (aMissing) return 1
  if (bMissing) return -1

  const base =
    type === 'string' ? String(a).localeCompare(String(b)) : Number(a) - Number(b)
  return direction === 'asc' ? base : -base
}

function compareRows(
  a: StatsTableRow,
  b: StatsTableRow,
  key: string,
  type: SortType,
  direction: SortDirection,
) {
  const pinDelta = (a.pinBottom ? 1 : 0) - (b.pinBottom ? 1 : 0)
  if (pinDelta !== 0) return pinDelta
  return compareValues(a.sortValues?.[key] ?? null, b.sortValues?.[key] ?? null, type, direction)
}

function SortIndicator({ direction }: { direction: SortDirection }) {
  if (direction === 'asc') return <ArrowUp className="size-3" aria-hidden="true" />
  return <ArrowDown className="size-3" aria-hidden="true" />
}

function RankCell({ rank }: { rank: number }) {
  return (
    <td className="px-3 py-2 text-center text-(--cream)/50 tabular-nums">
      {rank === 1 ? '👑' : rank}
    </td>
  )
}

export function StatsLeaderboardTable({
  columns,
  rows,
  initialSort,
  rowVariant = 'default',
  emptyState,
}: Props) {
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(
    initialSort ?? null,
  )

  const rankColumn = columns.find((column) => column.rank)

  const sortedRows = useMemo(() => {
    if (!sort) {
      return [...rows.filter((row) => !row.pinBottom), ...rows.filter((row) => row.pinBottom)]
    }
    const column = columns.find((candidate) => candidate.sortKey === sort.key)
    const type = column?.sortType ?? 'number'
    return [...rows].sort((a, b) => compareRows(a, b, sort.key, type, sort.direction))
  }, [rows, sort, columns])

  // Ranks are fixed to the card's default metric (initialSort), keyed by row identity, so
  // re-sorting the table reorders the rows without renumbering the rank column.
  const rankByKey = useMemo(() => {
    if (!rankColumn) return null
    const map = new Map<StatsTableRow['key'], number>()
    if (!initialSort) {
      rows.forEach((row, index) => map.set(row.key, index + 1))
      return map
    }
    const { key, direction } = initialSort
    const type = columns.find((candidate) => candidate.sortKey === key)?.sortType ?? 'number'
    const baseRows = [...rows].sort((a, b) => compareRows(a, b, key, type, direction))
    // Rank on a pin-aware composite so a pinned row never shares a rank across the partition.
    const ranks = rankWithTies(
      baseRows,
      (row) => `${row.pinBottom ? 1 : 0}|${row.sortValues?.[key] ?? ''}`,
    )
    baseRows.forEach((row, index) => map.set(row.key, ranks[index]))
    return map
  }, [rankColumn, rows, initialSort, columns])

  function handleSort(column: StatsTableColumn) {
    const key = column.sortKey
    if (!key) return
    setSort((previous) => {
      if (previous && previous.key === key) {
        return { key, direction: previous.direction === 'asc' ? 'desc' : 'asc' }
      }
      const direction = column.defaultDirection ?? (column.sortType === 'string' ? 'asc' : 'desc')
      return { key, direction }
    })
  }

  return (
    <div className="
      overflow-hidden rounded-xl border border-(--border-gold-subtle)
    ">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--border-gold) bg-(--navy-950)/60">
              {columns.map((column) => {
                const isSortable = Boolean(column.sortKey)
                const isActive = isSortable && sort?.key === column.sortKey
                const ariaSort = getAriaSort(isSortable, isActive, sort?.direction)

                return (
                  <th
                    key={column.label}
                    scope="col"
                    aria-sort={ariaSort}
                    className={`
                      px-3 py-2 text-[10px] font-semibold tracking-[0.18em]
                      text-(--gold)/85 uppercase
                      ${getAlignmentClass(column.align)}
                      ${column.widthClass ?? ''}
                    `}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className={`
                          inline-flex cursor-pointer items-center gap-1
                          tracking-[0.18em] uppercase transition-colors
                          hover:text-(--gold)
                          ${isActive ? 'text-(--gold)' : ''}
                        `}
                      >
                        {column.label}
                        {isActive ? <SortIndicator direction={sort?.direction ?? 'desc'} /> : null}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && emptyState ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-sm text-(--cream)/50"
                >
                  {emptyState}
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => (
                <tr key={row.key} className={ROW_VARIANT_CLASS[rowVariant]}>
                  {rankColumn ? (
                    <RankCell rank={rankByKey?.get(row.key) ?? index + 1} />
                  ) : null}
                  {row.cells}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
