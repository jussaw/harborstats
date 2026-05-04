'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { PageWidth } from './PageWidth'

interface StatsAnchorNavSection {
  id: string
  title: string
}

interface StatsAnchorNavProps {
  sections: StatsAnchorNavSection[]
}

export function StatsAnchorNav({ sections }: StatsAnchorNavProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '')

  const updateActiveId = useEffectEvent((entries: IntersectionObserverEntry[]) => {
    const firstVisibleEntry = entries.find((entry) => entry.isIntersecting)

    if (firstVisibleEntry) {
      setActiveId(firstVisibleEntry.target.id)
    }
  })

  useEffect(() => {
    if (sections.length === 0 || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        updateActiveId(entries)
      },
      { rootMargin: '-30% 0px -60% 0px' },
    )

    sections.forEach((section) => {
      const element = document.getElementById(section.id)

      if (element) {
        observer.observe(element)
      }
    })

    return () => {
      observer.disconnect()
    }
  }, [sections])

  return (
    <nav
      aria-label="Stats sections"
      className="
        sticky top-0 z-30 mb-8 border-y border-(--gold)/15 bg-(--navy-900)/85
        shadow-[0_16px_32px_rgba(0,0,0,0.22)] backdrop-blur-md
      "
    >
      <PageWidth
        as="div"
        width="7xl"
        className="
          px-4
          sm:px-6
        "
      >
        <ul className="harbor-scrollbar flex gap-2 overflow-x-auto py-1.5">
          {sections.map((section) => {
            const isActive = activeId === section.id

            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`
                    inline-flex rounded-full border px-4 py-2 text-sm
                    font-semibold tracking-wide transition-colors
                    ${isActive
                      ? 'border-(--gold) bg-(--gold)/12 text-(--gold)'
                      : `
                        border-(--gold)/15 bg-(--navy-800)/35 text-(--cream)/70
                        hover:border-(--gold)/35 hover:text-(--cream)
                      `}
                  `}
                >
                  {section.title}
                </a>
              </li>
            )
          })}
        </ul>
      </PageWidth>
    </nav>
  )
}
