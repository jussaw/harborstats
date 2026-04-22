import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BusiestRecordsCard } from '@/components/BusiestRecordsCard'

describe('BusiestRecordsCard', () => {
  it('renders the busiest local day, week, and month summaries', () => {
    render(
      <BusiestRecordsCard
        playedAtIsos={[
          '2026-03-01T01:00:00.000Z',
          '2026-03-01T03:00:00.000Z',
          '2026-03-01T20:00:00.000Z',
          '2026-03-03T05:00:00.000Z',
          '2026-03-17T04:00:00.000Z',
        ]}
        timeZone="America/New_York"
      />,
    )

    expect(screen.getByText('Day')).toBeInTheDocument()
    expect(screen.getByText('Week')).toBeInTheDocument()
    expect(screen.getByText('Month')).toBeInTheDocument()
    expect(screen.getByText('Feb 28, 2026')).toBeInTheDocument()
    expect(screen.getByText('Week of Feb 23')).toBeInTheDocument()
    expect(screen.getByText('Mar 2026')).toBeInTheDocument()
    expect(screen.getByText('2 games')).toBeInTheDocument()
    expect(screen.getAllByText('3 games')).toHaveLength(2)
  })

  it('renders an empty state with no games', () => {
    render(<BusiestRecordsCard playedAtIsos={[]} timeZone="America/New_York" />)

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })
})
