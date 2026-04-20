import type { ReactNode } from 'react'

interface Props {
  id: string
  title: string
  description: string
  badge: string | undefined
  span: 'single' | 'full'
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
      className={`scroll-mt-28 sm:scroll-mt-8 ${span === 'full' ? 'lg:col-span-2' : ''}`}
    >
      <div className="rounded-2xl border border-[var(--gold)]/20 bg-[var(--navy-900)]/40 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:p-5">
        <div className="flex flex-col gap-3 border-b border-[var(--gold)]/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 style={cinzelStyle} className="text-xl tracking-wide text-[var(--cream)]">
              {title}
            </h2>
            <p className="mt-1 text-sm text-[var(--cream)]/55">{description}</p>
          </div>
          {badge && (
            <span className="inline-flex rounded-full border border-[var(--gold)]/20 bg-[var(--gold)]/10 px-3 py-1 text-[11px] font-semibold tracking-[0.25em] text-[var(--gold)] uppercase">
              {badge}
            </span>
          )}
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </section>
  )
}
