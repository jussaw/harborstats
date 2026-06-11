import type { ReactNode } from 'react'

interface Column {
  label: string
  align?: 'left' | 'center' | 'right'
  widthClass?: string
}

interface Props {
  columns: Column[]
  children: ReactNode
}

function getAlignmentClass(align: Column['align']) {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

export function StatsLeaderboardTable({ columns, children }: Props) {
  return (
    <div className="
      overflow-hidden rounded-xl border border-(--border-gold-subtle)
    ">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--border-gold) bg-(--navy-950)/60">
              {columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={`
                    px-3 py-2 text-[10px] font-semibold tracking-[0.18em]
                    text-(--gold)/85 uppercase
                    ${getAlignmentClass(column.align)}
                    ${column.widthClass ?? ''}
                  `}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}
