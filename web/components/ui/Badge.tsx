import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  className?: string
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex rounded-full border border-(--border-gold) bg-(--gold)/10
        px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-(--gold)
        uppercase
        ${className}
      `}
    >
      {children}
    </span>
  )
}
