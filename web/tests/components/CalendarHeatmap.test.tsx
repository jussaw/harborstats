import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CalendarHeatmap } from '@/components/CalendarHeatmap'

describe('CalendarHeatmap', () => {
  it('defaults to recent activity, clears hover details on pointer leave, and supports keyboard focus', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-24T16:00:00.000Z'))

    try {
      render(
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

      expect(screen.getByRole('button', { name: 'Last 12 Months' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      const detailSlot = screen.getByTestId('stats-card-detail-slot')

      expect(detailSlot).toHaveAttribute('data-detail-size', 'roomy')
      expect(screen.getByText('Apr 25, 2025 - Apr 24, 2026')).toBeInTheDocument()
      expect(screen.queryByText('Sun')).not.toBeInTheDocument()
      expect(screen.queryByText('Tue')).not.toBeInTheDocument()
      expect(screen.queryByText('Thu')).not.toBeInTheDocument()
      expect(screen.queryByText('Sat')).not.toBeInTheDocument()

      const zeroDay = screen.getByRole('button', { name: 'Apr 24, 2026: 0 games' })
      const activeDay = screen.getByRole('button', { name: 'Apr 20, 2026: 2 games' })

      expect(zeroDay).toHaveAttribute('data-intensity', '0')
      expect(activeDay).toHaveAttribute('data-intensity', '4')

      fireEvent.mouseEnter(zeroDay)
      expect(screen.getByText('Apr 24, 2026')).toBeInTheDocument()
      expect(screen.getByText('0 games')).toBeInTheDocument()

      fireEvent.mouseEnter(activeDay)

      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(screen.getByText('Apr 20, 2026')).toBeInTheDocument()
      expect(screen.getByText('2 games')).toBeInTheDocument()
      fireEvent.mouseLeave(screen.getByRole('grid', { name: 'Calendar heatmap' }))
      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(screen.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()

      fireEvent.focus(activeDay)
      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(screen.getByText('Apr 20, 2026')).toBeInTheDocument()
      fireEvent.blur(activeDay)
      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(screen.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: '2025' }))
      const yearDay = screen.getByRole('button', { name: 'Dec 31, 2025: 1 game' })
      fireEvent.mouseEnter(yearDay)

      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(screen.getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('Dec 31, 2025')).toBeInTheDocument()
      fireEvent.mouseLeave(screen.getByRole('grid', { name: 'Calendar heatmap' }))
      expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
      expect(screen.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()
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
