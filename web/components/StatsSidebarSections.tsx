'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { STATS_SECTIONS } from '@/lib/stats-sections'

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

interface StatsSidebarSectionsProps {
  collapsed: boolean
  onNavigate: () => void
  scrollContainerId?: string
}

export function StatsSidebarSections({
  collapsed,
  onNavigate,
  scrollContainerId = 'stats-scroll',
}: StatsSidebarSectionsProps) {
  const [activeId, setActiveId] = useState<string>(STATS_SECTIONS[0]?.id ?? '')

  const updateActiveId = useEffectEvent((entries: IntersectionObserverEntry[]) => {
    const firstVisibleEntry = entries.find((entry) => entry.isIntersecting)

    if (firstVisibleEntry) {
      setActiveId(firstVisibleEntry.target.id)
    }
  })

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const root = scrollContainerId ? document.getElementById(scrollContainerId) : null
    const observer = new IntersectionObserver(
      (entries) => {
        updateActiveId(entries)
      },
      { root, rootMargin: '-30% 0px -60% 0px' },
    )

    STATS_SECTIONS.forEach((section) => {
      const element = document.getElementById(section.id)

      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [scrollContainerId])

  return (
    <ul
      aria-label="Stats sections"
      className={`
        my-1 ml-4 space-y-0.5 border-l border-(--gold)/15 pl-3
        ${collapsed ? 'sm:hidden' : ''}
      `}
    >
      {STATS_SECTIONS.map((section) => {
        const isActive = activeId === section.id

        return (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={isActive ? 'true' : undefined}
              onClick={onNavigate}
              style={cinzelStyle}
              className={`
                block rounded-md px-2 py-1.5 text-[11px] tracking-widest
                uppercase transition-colors
                ${isActive
                  ? 'bg-(--gold)/10 text-(--gold)'
                  : `
                    text-(--cream)/50
                    hover:bg-(--navy-800)/50 hover:text-(--cream)
                  `}
              `}
            >
              {section.title}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

StatsSidebarSections.defaultProps = {
  scrollContainerId: 'stats-scroll',
}
