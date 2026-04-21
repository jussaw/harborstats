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

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

function getAlignmentClass(align: Column['align']) {
  if (align === 'center') return 'text-center'
  if (align === 'right') return 'text-right'
  return 'text-left'
}

export function StatsLeaderboardTable({ columns, children }: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-(--gold)/20">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-(--gold)/20 bg-(--navy-900)/80">
              {columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  style={cinzelStyle}
                  className={`
                    px-3 py-2 text-xs tracking-widest text-(--cream)/50
                    uppercase
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
