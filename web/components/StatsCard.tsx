import type { ReactNode } from 'react'

interface Props {
  id: string
  title: string
  description: string
  badge: string | undefined
  span: 'single' | 'full'
  children: ReactNode
}

interface StatsCardDetailSlotProps {
  size: 'compact' | 'roomy' | 'tall'
  className?: string
  children: ReactNode
}

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

export function StatsCard({
  id,
  title,
  description,
  badge,
  span,
  children,
}: Props) {
  return (
    <section
      id={id}
      className={`
        scroll-mt-28
        sm:scroll-mt-8
        ${span === 'full' ? `lg:col-span-2` : ''}
      `}
    >
      <div className="
        flex h-full flex-col rounded-2xl border border-(--gold)/20
        bg-(--navy-900)/40 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]
        sm:p-5
      ">
        <div className="
          flex flex-col gap-3 border-b border-(--gold)/10 pb-4
          sm:flex-row sm:items-start sm:justify-between
        ">
          <div>
            <h2 style={cinzelStyle} className="
              text-xl tracking-wide text-(--cream)
            ">
              {title}
            </h2>
            <p className="mt-1 text-sm text-(--cream)/55">{description}</p>
          </div>
          {badge && (
            <span className="
              inline-flex rounded-full border border-(--gold)/20 bg-(--gold)/10
              px-3 py-1 text-[11px] font-semibold tracking-[0.25em]
              text-(--gold) uppercase
              sm:shrink-0 sm:whitespace-nowrap
            ">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-4 flex-1">{children}</div>
      </div>
    </section>
  )
}

function getDetailSlotHeightClass(size: StatsCardDetailSlotProps['size']) {
  if (size === 'tall') {
    return 'h-44'
  }

  if (size === 'roomy') {
    return 'h-24'
  }

  return 'h-20'
}

export function StatsCardDetailSlot({
  size,
  className = '',
  children,
}: StatsCardDetailSlotProps) {
  return (
    <div
      data-testid="stats-card-detail-slot"
      data-detail-size={size}
      className={`
        flex min-w-0 flex-col justify-start
        ${getDetailSlotHeightClass(size)}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

StatsCardDetailSlot.defaultProps = {
  className: undefined,
}
