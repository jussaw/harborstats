import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StatsAnchorNav } from '@/components/StatsAnchorNav'

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

function StatsAnchorNavHarness() {
  const sections = [
    { id: 'headline', title: 'Headline' },
    { id: 'scoring', title: 'Scoring' },
    { id: 'records', title: 'Records' },
  ]

  return (
    <>
      <StatsAnchorNav sections={sections} />
      {sections.map((section) => (
        <section key={section.id} id={section.id}>
          <h2>{section.title}</h2>
        </section>
      ))}
    </>
  )
}

describe('StatsAnchorNav', () => {
  beforeEach(() => {
    observerInstances.length = 0
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  it('renders section links and highlights the first section by default', () => {
    render(<StatsAnchorNavHarness />)

    expect(screen.getByRole('link', { name: 'Headline' })).toHaveAttribute('href', '#headline')
    expect(screen.getByRole('link', { name: 'Scoring' })).toHaveAttribute('href', '#scoring')
    expect(screen.getByRole('link', { name: 'Records' })).toHaveAttribute('href', '#records')
    expect(screen.getByRole('link', { name: 'Headline' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('link', { name: 'Scoring' })).not.toHaveAttribute('aria-current')
    expect(observerInstances).toHaveLength(1)
  })

  it('updates the active pill when a different section enters view', async () => {
    render(<StatsAnchorNavHarness />)

    const scoringSection = document.getElementById('scoring')

    expect(scoringSection).not.toBeNull()

    act(() => {
      observerInstances[0].trigger([
        {
          isIntersecting: true,
          target: scoringSection!,
        },
      ])
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Scoring' })).toHaveAttribute(
        'aria-current',
        'true',
      )
    })

    expect(screen.getByRole('link', { name: 'Headline' })).not.toHaveAttribute('aria-current')
  })

  it('scopes the observer to the scroll container when scrollContainerId is provided', () => {
    const sections = [
      { id: 'headline', title: 'Headline' },
      { id: 'scoring', title: 'Scoring' },
      { id: 'records', title: 'Records' },
    ]

    render(
      <>
        <StatsAnchorNav sections={sections} scrollContainerId="stats-scroll" />
        <div id="stats-scroll">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2>{section.title}</h2>
            </section>
          ))}
        </div>
      </>,
    )

    const scrollContainer = document.getElementById('stats-scroll')

    expect(scrollContainer).not.toBeNull()
    expect(observerInstances).toHaveLength(1)
    expect(observerInstances[0].root).toBe(scrollContainer)
    expect(observerInstances[0].observe).toHaveBeenCalledTimes(sections.length)
  })
})
