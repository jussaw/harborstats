import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { CalendarHeatmap } from '@/components/CalendarHeatmap'

describe('CalendarHeatmap', () => {
  it('defaults to recent activity, clears hover details on pointer leave, and supports keyboard focus', async () => {
    const user = userEvent.setup()

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
    expect(screen.getByText('Apr 23, 2025 - Apr 22, 2026')).toBeInTheDocument()

    const zeroDay = screen.getByRole('button', { name: 'Apr 21, 2026: 0 games' })
    const activeDay = screen.getByRole('button', { name: 'Apr 20, 2026: 2 games' })

    expect(zeroDay).toHaveAttribute('data-intensity', '0')
    expect(activeDay).toHaveAttribute('data-intensity', '4')

    await user.hover(activeDay)

    expect(screen.getByText('Apr 20, 2026')).toBeInTheDocument()
    expect(screen.getByText('2 games')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('grid', { name: 'Calendar heatmap' }))
    expect(screen.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()

    fireEvent.focus(activeDay)
    expect(screen.getByText('Apr 20, 2026')).toBeInTheDocument()
    fireEvent.blur(activeDay)
    expect(screen.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '2025' }))
    const yearDay = screen.getByRole('button', { name: 'Dec 31, 2025: 1 game' })
    await user.hover(yearDay)

    expect(screen.getByRole('button', { name: '2025' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Dec 31, 2025')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('grid', { name: 'Calendar heatmap' }))
    expect(screen.getByText('Hover over a day to inspect activity.')).toBeInTheDocument()
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
