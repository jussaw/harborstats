import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { GamesOverTimeChart } from '@/components/GamesOverTimeChart'

describe('GamesOverTimeChart', () => {
  it('reveals bucket details on hover, clears them on mouse leave, and preserves focus behavior', async () => {
    const user = userEvent.setup()

    render(
      <GamesOverTimeChart
        playedAtIsos={[
          '2026-03-01T01:00:00.000Z',
          '2026-03-02T04:00:00.000Z',
          '2026-03-03T05:00:00.000Z',
          '2026-03-17T04:00:00.000Z',
        ]}
        timeZone="America/New_York"
        defaultView="week"
      />,
    )

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Feb 23')).toBeInTheDocument()
    expect(screen.getByText('Mar 16')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    const detailSlot = screen.getByTestId('stats-card-detail-slot')

    expect(detailSlot).toHaveAttribute('data-detail-size', 'compact')
    expect(screen.getByText('Hover over a data point to inspect its bucket.')).toBeInTheDocument()

    const firstBucket = screen.getByRole('button', { name: 'Feb 23: 2 games' })

    await user.hover(firstBucket)

    expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
    expect(screen.getByText('2 games')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Games over time (week)' }))
    expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
    expect(screen.getByText('Hover over a data point to inspect its bucket.')).toBeInTheDocument()

    fireEvent.focus(firstBucket)
    expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
    expect(screen.getByText('2 games')).toBeInTheDocument()
    fireEvent.blur(firstBucket)
    expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
    expect(screen.getByText('Hover over a data point to inspect its bucket.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Month' }))

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Hover over a data point to inspect its bucket.')).toBeInTheDocument()
    expect(screen.queryByText('Feb 23')).not.toBeInTheDocument()

    const monthBucket = screen.getByRole('button', { name: 'Feb 2026: 1 game' })

    await user.hover(monthBucket)

    expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
    expect(screen.getAllByText('Feb 2026')).toHaveLength(2)
    expect(screen.getByText('1 game')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Games over time (month)' }))
    expect(screen.getByTestId('stats-card-detail-slot')).toBe(detailSlot)
    expect(screen.getByText('Hover over a data point to inspect its bucket.')).toBeInTheDocument()
  })

  it('renders an empty state with no games', () => {
    render(
      <GamesOverTimeChart
        playedAtIsos={[]}
        timeZone="America/New_York"
        defaultView="week"
      />,
    )

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })
})
