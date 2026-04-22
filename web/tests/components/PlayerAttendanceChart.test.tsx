import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PlayerAttendanceChart } from '@/components/PlayerAttendanceChart'
import { PlayerTier } from '@/lib/player-tier'

describe('PlayerAttendanceChart', () => {
  it('shows legend entries and clears hover details when the pointer leaves the chart', async () => {
    const user = userEvent.setup()

    render(
      <PlayerAttendanceChart
        events={[
          {
            playedAt: '2026-03-01T01:00:00.000Z',
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
          },
          {
            playedAt: '2026-03-01T01:00:00.000Z',
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
          },
          {
            playedAt: '2026-03-02T04:00:00.000Z',
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
          },
          {
            playedAt: '2026-03-17T04:00:00.000Z',
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
          },
          {
            playedAt: '2026-03-17T04:00:00.000Z',
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
          },
        ]}
        timeZone="America/New_York"
        defaultView="week"
      />,
    )

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByText('Ada')).toBeInTheDocument()
    expect(screen.getByText('Bea')).toBeInTheDocument()
    expect(screen.getByText('Hover over a bar to inspect attendance.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const firstBucket = screen.getByRole('button', { name: 'Feb 23: 3 appearances' })

    await user.hover(firstBucket)

    const firstDialog = screen.getByRole('dialog', { name: 'Attendance details for Feb 23' })

    expect(firstDialog).toHaveAttribute('data-side', 'right')
    const firstTop = Number.parseFloat(firstDialog.style.top)
    expect(screen.getByText('3 appearances')).toBeInTheDocument()
    expect(screen.getByText('Ada: 2')).toBeInTheDocument()
    expect(screen.getByText('Bea: 1')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Player attendance over time (week)' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Hover over a bar to inspect attendance.')).toBeInTheDocument()

    fireEvent.focus(firstBucket)
    expect(screen.getByRole('dialog', { name: 'Attendance details for Feb 23' })).toBeInTheDocument()
    fireEvent.blur(firstBucket)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: 'Mar 9: 0 appearances' }))

    const secondDialog = screen.getByRole('dialog', { name: 'Attendance details for Mar 9' })

    expect(secondDialog).toHaveAttribute('data-side', 'left')
    const secondTop = Number.parseFloat(secondDialog.style.top)
    expect(secondTop).toBeGreaterThan(firstTop)
    expect(secondTop).toBeLessThan(65)
    expect(screen.getByText('No appearances in this bucket.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Month' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const monthBucket = screen.getByRole('button', { name: 'Feb 2026: 2 appearances' })
    await user.hover(monthBucket)

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen.getByRole('dialog', { name: 'Attendance details for Feb 2026' }),
    ).toBeInTheDocument()
    expect(screen.getByText('2 appearances')).toBeInTheDocument()
    expect(screen.getByText('Ada: 1')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Player attendance over time (month)' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders an empty state with no attendance data', () => {
    render(
      <PlayerAttendanceChart
        events={[]}
        timeZone="America/New_York"
        defaultView="week"
      />,
    )

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })
})
