import type { ReactNode } from 'react'
import { Badge } from './Badge'

export const cardSurfaceClasses = `
  rounded-2xl border border-(--border-gold-subtle) bg-(--surface)
  shadow-(--shadow-card) backdrop-blur-md
`

interface CardProps {
  children: ReactNode
  title?: string
  description?: string
  badge?: string
  className?: string
  contentClassName?: string
}

export function Card({
  children,
  title,
  description,
  badge,
  className = '',
  contentClassName = '',
}: CardProps) {
  return (
    <div
      className={`
        flex flex-col p-4
        sm:p-5
        ${cardSurfaceClasses}
        ${className}
      `}
    >
      {title && (
        <div
          className="
            flex flex-col gap-3 border-b border-(--gold)/10 pb-4
            sm:flex-row sm:items-start sm:justify-between
          "
        >
          <div>
            <h2 className="font-cinzel text-xl tracking-wide text-(--cream)">{title}</h2>
            {description && <p className="mt-1 text-sm text-(--cream)/55">{description}</p>}
          </div>
          {badge && <Badge className="sm:shrink-0 sm:whitespace-nowrap">{badge}</Badge>}
        </div>
      )}

      <div className={title ? `
        mt-4
        ${contentClassName}
      ` : contentClassName}>{children}</div>
    </div>
  )
}
