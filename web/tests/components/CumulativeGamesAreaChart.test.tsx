import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CumulativeGamesAreaChart } from '@/components/CumulativeGamesAreaChart'

const { mockUseResolvedTimeZone } = vi.hoisted(() => ({
  mockUseResolvedTimeZone: vi.fn<(timeZone?: string) => string | null>(),
}))

vi.mock('@/lib/use-resolved-time-zone', () => ({
  localTimeLoadingMessage: 'Loading your local-time view...',
  useResolvedTimeZone: mockUseResolvedTimeZone,
}))

describe('CumulativeGamesAreaChart', () => {
  beforeEach(() => {
    mockUseResolvedTimeZone.mockReset()
    mockUseResolvedTimeZone.mockImplementation((timeZone?: string) => timeZone ?? null)
  })

  it('defaults to month view, supports toggling, and reveals cumulative bucket details on hover and focus', async () => {
    const user = userEvent.setup()

    render(
      <CumulativeGamesAreaChart
        playedAtIsos={[
          '2026-03-01T01:00:00.000Z',
          '2026-03-02T04:00:00.000Z',
          '2026-03-03T05:00:00.000Z',
          '2026-03-17T04:00:00.000Z',
        ]}
        timeZone="America/New_York"
        defaultView="month"
      />,
    )

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Hover over a data point to inspect cumulative progress.')).toBeInTheDocument()
    expect(screen.getByText('Feb 2026')).toBeInTheDocument()
    expect(screen.getByText('Mar 2026')).toBeInTheDocument()
    const detailSlot = screen.getByTestId('stats-card-detail-slot')

    expect(detailSlot).toHaveAttribute('data-detail-size', 'compact')

    const firstMonthBucket = screen.getByRole('button', {
      name: 'Feb 2026: 1 cumulative game, 1 added',
    })

    await user.hover(firstMonthBucket)

    expect(screen.getAllByText('Feb 2026')).toHaveLength(2)
    expect(screen.getByText('1 total game')).toBeInTheDocument()
    expect(screen.getByText('Added 1 game in this bucket')).toBeInTheDocument()
    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Cumulative games over time (month)' }))
    expect(screen.getByText('Hover over a data point to inspect cumulative progress.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Week' }))

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('Feb 2026')).not.toBeInTheDocument()

    const zeroBucket = screen.getByRole('button', {
      name: 'Mar 9: 3 cumulative games, 0 added',
    })

    fireEvent.focus(zeroBucket)
    expect(screen.getAllByText('Mar 9')).toHaveLength(2)
    expect(screen.getByText('3 total games')).toBeInTheDocument()
    expect(screen.getByText('Added 0 games in this bucket')).toBeInTheDocument()
    fireEvent.blur(zeroBucket)
    expect(screen.getByText('Hover over a data point to inspect cumulative progress.')).toBeInTheDocument()
  })

  it('renders a loading state while the local timezone is unresolved', () => {
    render(
      <CumulativeGamesAreaChart
        playedAtIsos={['2026-03-01T01:00:00.000Z']}
        defaultView="month"
      />,
    )

    expect(screen.getByText('Loading your local-time view...')).toBeInTheDocument()
  })

  it('renders an empty state with no games', () => {
    render(
      <CumulativeGamesAreaChart
        playedAtIsos={[]}
        timeZone="America/New_York"
        defaultView="month"
      />,
    )

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })
})
