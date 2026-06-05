import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StatsSidebarSections } from '@/components/StatsSidebarSections'
import { STATS_SECTIONS } from '@/lib/stats-sections'

interface MockIntersectionObserverEntryOptions {
  isIntersecting: boolean
  target: Element
}

const observerInstances: MockIntersectionObserver[] = []

class MockIntersectionObserver {
  readonly callback: IntersectionObserverCallback

  readonly observe = vi.fn()

  readonly disconnect = vi.fn()

  readonly unobserve = vi.fn()

  readonly root: Element | Document | null

  readonly rootMargin: string

  readonly thresholds = [0]

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.root = options?.root ?? null
    this.rootMargin = options?.rootMargin ?? '0px'
    observerInstances.push(this)
  }

  readonly takeRecords = vi.fn(() => [])

  trigger(entries: MockIntersectionObserverEntryOptions[]) {
    this.callback(
      entries.map(({ isIntersecting, target }) => ({
        boundingClientRect: target.getBoundingClientRect(),
        intersectionRatio: isIntersecting ? 1 : 0,
        intersectionRect: isIntersecting ? target.getBoundingClientRect() : new DOMRectReadOnly(),
        isIntersecting,
        rootBounds: null,
        target,
        time: 0,
      })) as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    )
  }
}

function renderWithSections(overrides: { collapsed?: boolean; onNavigate?: () => void } = {}) {
  return render(
    <>
      <StatsSidebarSections
        collapsed={overrides.collapsed ?? false}
        onNavigate={overrides.onNavigate ?? vi.fn()}
      />
      <div id="stats-scroll">
        {STATS_SECTIONS.map((section) => (
          <section key={section.id} id={section.id}>
            <h2>{section.title}</h2>
          </section>
        ))}
      </div>
    </>,
  )
}

describe('StatsSidebarSections', () => {
  beforeEach(() => {
    observerInstances.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  it('renders a link per stat section and marks the first active by default', () => {
    renderWithSections()

    STATS_SECTIONS.forEach((section) => {
      expect(screen.getByRole('link', { name: section.title })).toHaveAttribute(
        'href',
        `#${section.id}`,
      )
    })

    const [first] = STATS_SECTIONS

    expect(screen.getByRole('link', { name: first.title })).toHaveAttribute('aria-current', 'true')
  })

  it('scopes the observer to the scroll container and observes every section', () => {
    renderWithSections()

    const scrollContainer = document.getElementById('stats-scroll')

    expect(observerInstances).toHaveLength(1)
    expect(observerInstances[0].root).toBe(scrollContainer)
    expect(observerInstances[0].observe).toHaveBeenCalledTimes(STATS_SECTIONS.length)
  })

  it('highlights the section that scrolls into view', async () => {
    renderWithSections()

    const target = STATS_SECTIONS[2]
    const element = document.getElementById(target.id)

    act(() => {
      observerInstances[0].trigger([{ isIntersecting: true, target: element! }])
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: target.title })).toHaveAttribute(
        'aria-current',
        'true',
      )
    })

    expect(screen.getByRole('link', { name: STATS_SECTIONS[0].title })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('calls onNavigate when a section link is clicked', async () => {
    const onNavigate = vi.fn()
    const user = userEvent.setup()

    renderWithSections({ onNavigate })

    await user.click(screen.getByRole('link', { name: STATS_SECTIONS[0].title }))

    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('hides the list on a collapsed desktop sidebar', () => {
    renderWithSections({ collapsed: true })

    expect(screen.getByRole('list', { name: 'Stats sections' })).toHaveClass('sm:hidden')
  })
})
