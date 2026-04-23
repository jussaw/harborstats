import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { FormattedDate } from '@/components/FormattedDate'

// React 19 hydration tests require the act environment flag in jsdom.
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', true)

function renderServerMarkup(ui: React.ReactElement) {
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')

  Object.defineProperty(globalThis, 'window', {
    value: undefined,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(globalThis, 'document', {
    value: undefined,
    configurable: true,
    writable: true,
  })

  try {
    return renderToString(ui)
  } finally {
    if (windowDescriptor) {
      Object.defineProperty(globalThis, 'window', windowDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'window')
    }

    if (documentDescriptor) {
      Object.defineProperty(globalThis, 'document', documentDescriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'document')
    }
  }
}

function mockBrowserTimeZone(timeZone: string) {
  const OriginalDateTimeFormat = Intl.DateTimeFormat

  // Vitest requires a constructable function when spying on this constructor.
  // eslint-disable-next-line prefer-arrow-callback
  return vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function mockDateTimeFormat(
    locales,
    options,
  ) {
    if (options === undefined) {
      return {
        resolvedOptions: () => ({
          ...new OriginalDateTimeFormat(locales, options).resolvedOptions(),
          timeZone,
        }),
      } as Intl.DateTimeFormat
    }

    return new OriginalDateTimeFormat(locales, options)
  })
}

describe('FormattedDate', () => {
  it('renders a neutral placeholder during server render instead of a UTC timestamp', () => {
    const markup = renderServerMarkup(
      <FormattedDate iso="2026-04-21T03:30:00.000Z" className="text-xs" />,
    )

    expect(markup).toContain('...')
    expect(markup).not.toContain('Apr 21, 2026, 3:30 AM')
  })

  it('hydrates to the browser local timezone for datetime labels', async () => {
    const dateTimeFormatSpy = mockBrowserTimeZone('America/New_York')
    const container = document.createElement('div')
    container.innerHTML = renderServerMarkup(
      <FormattedDate iso="2026-04-21T03:30:00.000Z" className="text-xs" />,
    )
    document.body.appendChild(container)

    let root: ReturnType<typeof hydrateRoot> | null = null

    try {
      await act(async () => {
        root = hydrateRoot(
          container,
          <FormattedDate iso="2026-04-21T03:30:00.000Z" className="text-xs" />,
        )
        await Promise.resolve()
      })

      expect(container.textContent).toBe('Apr 20, 2026, 11:30 PM')
    } finally {
      dateTimeFormatSpy.mockRestore()
      await act(async () => {
        root?.unmount()
        await Promise.resolve()
      })
    }
  })

  it('hydrates date-only labels using the viewer local calendar day', async () => {
    const dateTimeFormatSpy = mockBrowserTimeZone('America/New_York')
    const container = document.createElement('div')
    container.innerHTML = renderServerMarkup(
      <FormattedDate iso="2026-04-21T03:30:00.000Z" className="text-xs" dateOnly />,
    )
    document.body.appendChild(container)

    let root: ReturnType<typeof hydrateRoot> | null = null

    try {
      await act(async () => {
        root = hydrateRoot(
          container,
          <FormattedDate iso="2026-04-21T03:30:00.000Z" className="text-xs" dateOnly />,
        )
        await Promise.resolve()
      })

      expect(container.textContent).toBe('Apr 20, 2026')
    } finally {
      dateTimeFormatSpy.mockRestore()
      await act(async () => {
        root?.unmount()
        await Promise.resolve()
      })
    }
  })

  it('uses an explicit timezone override when provided', () => {
    const markup = renderServerMarkup(
      <FormattedDate
        iso="2026-04-21T03:30:00.000Z"
        className="text-xs"
        timeZone="America/Los_Angeles"
      />,
    )

    expect(markup).toContain('Apr 20, 2026, 8:30 PM')
  })
})
