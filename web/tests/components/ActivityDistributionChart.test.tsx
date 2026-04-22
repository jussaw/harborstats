import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ActivityDistributionChart } from '@/components/ActivityDistributionChart'

describe('ActivityDistributionChart', () => {
  it('renders weekday buckets and clears local counts when the pointer leaves the chart', async () => {
    const user = userEvent.setup()

    render(
      <ActivityDistributionChart
        playedAtIsos={[
          '2026-04-21T01:30:00.000Z',
          '2026-04-21T03:15:00.000Z',
          '2026-04-21T14:00:00.000Z',
        ]}
        timeZone="America/New_York"
        variant="weekday"
      />,
    )

    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    expect(screen.getByText('Hover over a bar to inspect activity.')).toBeInTheDocument()

    const mondayBucket = screen.getByRole('button', { name: 'Mon: 2 games' })

    await user.hover(mondayBucket)

    expect(screen.getAllByText('Mon')).toHaveLength(2)
    expect(screen.getByText('2 games')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Day-of-week pattern' }))
    expect(screen.getByText('Hover over a bar to inspect activity.')).toBeInTheDocument()

    fireEvent.focus(mondayBucket)
    expect(screen.getByText('2 games')).toBeInTheDocument()
    fireEvent.blur(mondayBucket)
    expect(screen.getByText('Hover over a bar to inspect activity.')).toBeInTheDocument()
  })

  it('renders hourly buckets in 12-hour labels', async () => {
    const user = userEvent.setup()

    render(
      <ActivityDistributionChart
        playedAtIsos={[
          '2026-04-21T01:30:00.000Z',
          '2026-04-21T03:15:00.000Z',
          '2026-04-21T14:00:00.000Z',
        ]}
        timeZone="America/New_York"
        variant="hour"
      />,
    )

    expect(screen.getByText('12 AM')).toBeInTheDocument()
    expect(screen.getByText('11 PM')).toBeInTheDocument()

    const lateBucket = screen.getByRole('button', { name: '11 PM: 1 game' })

    await user.hover(lateBucket)

    expect(screen.getAllByText('11 PM')).toHaveLength(2)
    expect(screen.getByText('1 game')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Time-of-day pattern' }))
    expect(screen.getByText('Hover over a bar to inspect activity.')).toBeInTheDocument()
  })

  it('renders an empty state with no activity', () => {
    render(
      <ActivityDistributionChart
        playedAtIsos={[]}
        timeZone="America/New_York"
        variant="weekday"
      />,
    )

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })
})
