import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CalendarHeatmap } from '@/components/CalendarHeatmap'

describe('CalendarHeatmap', () => {
  it('defaults to recent activity, clears hover details on pointer leave, and supports keyboard focus', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-24T16:00:00.000Z'))

    try {
      const { container } = render(
        <CalendarHeatmap
          playedAtIsos={[
            '2025-12-31T22:00:00.000Z',
            '2026-04-21T01:00:00.000Z',
            '2026-04-21T03:00:00.000Z',
            '2026-04-22T14:00:00.000Z',
          ]}
          timeZone="America/New_York"
          defaultSelection="recent"
        />,
      )

      // The grid renders ~370 day buttons, so any query that walks the whole
      // tree (getByRole('button', { name }) recomputing every accessible name,
      // or screen.getByText scanning every cell) dominates the test's runtime
      // and, under full-suite CPU contention, pushes it against the default
      // testTimeout. Keep every lookup off the day grid:
      //   - day cells: query by their exact aria-label (their accessible name)
      //     via a cheap attribute selector;
      //   - view toggles: scope to the controls container (no day buttons);
      //   - activity detail text: scope to the detail slot, where the app
      //     renders it, instead of the whole document.
      // A single representative cell per view still asserts the button role +
      // accessible-name contract.
      const dayCell = (label: string): HTMLButtonElement => {
        const cell = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)
        if (!cell) {
          throw new Error(`No calendar day cell for "${label}"`)
        }
        return cell
      }

      const detailSlot = screen.getByTestId('stats-card-detail-slot')
      const detail = within(detailSlot)
      const controls = within(detailSlot.parentElement as HTMLElement)
      const grid = screen.getByRole('grid', { name: 'Calendar heatmap' })

      expect(controls.getByRole('button', { name: 'Last 12 Months' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )

      expect(detailSlot).toHaveAttribute('data-detail-size', 'roomy')
      expect(detail.getByText('Apr 25, 2025 - Apr 24, 2026')).toBeInTheDocument()
      expect(screen.queryByText('Sun')).not.toBeInTheDocument()
      expect(screen.queryByText('Tue')).not.toBeInTheDocument()
      expect(screen.queryByText('Thu')).not.toBeInTheDocument()
      expect(screen.queryByText('Sat')).not.toBeInTheDocument()

      const zeroDay = dayCell('Apr 24, 2026: 0 games')
      const activeDay = dayCell('Apr 20, 2026: 2 games')

      // Representative accessible role/name contract for the recent view's cells.
      expect(zeroDay).toHaveRole('button')
      expect(zeroDay).toHaveAccessibleName('Apr 24, 2026: 0 games')
      expect(zeroDay).toHaveAttribute('data-intensity', '0')
      expect(activeDay).toHaveAttribute('data-intensity', '4')

      fireEvent.mouseEnter(zeroDay)
      expect(detail.getByText('Apr 24, 2026')).toBeInTheDocument()
      expect(detail.getByText('0 games')).toBeInTheDocument()

      fireEvent.mouseEnter(activeDay)

      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(detail.getByText('Apr 20, 2026')).toBeInTheDocument()
      expect(detail.getByText('2 games')).toBeInTheDocument()
      fireEvent.mouseLeave(grid)
      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(detail.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()

      fireEvent.focus(activeDay)
      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(detail.getByText('Apr 20, 2026')).toBeInTheDocument()
      fireEvent.blur(activeDay)
      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(detail.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()

      fireEvent.click(controls.getByRole('button', { name: '2025' }))
      const yearDay = dayCell('Dec 31, 2025: 1 game')

      // Representative accessible role/name contract for the year view's cells.
      expect(yearDay).toHaveRole('button')
      expect(yearDay).toHaveAccessibleName('Dec 31, 2025: 1 game')
      fireEvent.mouseEnter(yearDay)

      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(controls.getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true')
      expect(detail.getByText('Dec 31, 2025')).toBeInTheDocument()
      fireEvent.mouseLeave(grid)
      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(detail.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders an empty state with no recorded days', () => {
    render(
      <CalendarHeatmap
        playedAtIsos={[]}
        timeZone="America/New_York"
        defaultSelection="recent"
      />,
    )

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })

  it('supports the browser-resolved timezone path without changing hook order', async () => {
    render(
      <CalendarHeatmap
        playedAtIsos={[
          '2026-04-21T01:00:00.000Z',
          '2026-04-21T03:00:00.000Z',
        ]}
        defaultSelection="recent"
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Last 12 Months' })).toBeInTheDocument()
    })
  })
})
