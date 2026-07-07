'use client'

import { useCallback, useState, type ChangeEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { matchesWildcard } from '@/lib/wildcard'
import type { StatsSectionId } from '@/lib/stats-sections'
import { Input } from './ui/Field'
import { StatsCard } from './StatsCard'
import { StatsSectionHeader } from './StatsSectionHeader'

export interface StatsCardView {
  id: string
  title: string
  description: string
  badge: string | undefined
  span: 'single' | 'full'
  content: ReactNode
}

export interface StatsSectionView {
  id: StatsSectionId
  title: string
  subtitle: string
  cards: StatsCardView[]
}

interface Props {
  sections: StatsSectionView[]
  // Rendered inline to the left of the search input in the sticky header (e.g. the player filter).
  filter?: ReactNode
}

export function StatsSearch({ sections, filter }: Props) {
  const [query, setQuery] = useState('')

  const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value)
  }, [])

  const handleClear = useCallback(() => {
    setQuery('')
  }, [])

  const visibleSections = sections.map((section) => {
    const cards = section.cards.filter((card) => matchesWildcard(card.title, query))

    return { section, cards }
  })

  const hasResults = visibleSections.some(({ cards }) => cards.length > 0)

  return (
    <div className="space-y-8">
      <div
        className="
          sticky top-0 z-10 -mx-4 border-b border-(--border-gold-subtle)
          bg-(--navy-900) px-4 py-3
          sm:-mx-6 sm:px-6
        "
      >
        <div className="flex items-center gap-3">
          {/*
            Wrap the slot so the caller's element renders as a single child, avoiding a
            spurious "unique key" warning React emits for a prop-passed element placed
            directly in a children array.
          */}
          {filter ? <div className="shrink-0">{filter}</div> : null}
          <div className="relative flex-1">
            <Input
              type="search"
              value={query}
              onChange={handleChange}
              placeholder="Search stats…"
              aria-label="Search stats"
              className="w-full"
            />
            {query !== '' ? (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                className="
                  absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1
                  text-(--cream)/50 transition-colors
                  hover:text-(--cream)
                "
              >
                <X className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {visibleSections.map(({ section, cards }) => (
          <section
            key={section.id}
            id={section.id}
            className={`
              scroll-mt-20
              ${cards.length === 0 ? 'hidden' : ''}
            `}
          >
            <StatsSectionHeader title={section.title} subtitle={section.subtitle} />

            <div
              className="
                grid grid-cols-1 gap-5
                lg:grid-cols-2
              "
            >
              {cards.map((card) => (
                <StatsCard key={card.id} {...card}>
                  {card.content}
                </StatsCard>
              ))}
            </div>
          </section>
        ))}
      </div>

      {hasResults ? null : (
        <p className="py-12 text-center text-sm text-(--cream)/50">
          No stats match “{query.trim()}”.
        </p>
      )}
    </div>
  )
}
