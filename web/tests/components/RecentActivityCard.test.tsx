import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RecentActivityCard } from '@/components/RecentActivityCard'

describe('RecentActivityCard', () => {
  it('computes day gaps from the viewer local calendar', () => {
    render(
      <RecentActivityCard
        latestPlayedAt="2026-04-21T03:30:00.000Z"
        timeZone="America/New_York"
        now={new Date('2026-04-21T05:00:00.000Z')}
      />,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Latest recorded game')).toBeInTheDocument()
    expect(screen.getByText('Apr 21, 2026, 3:30 AM')).toBeInTheDocument()
  })

  it('renders an empty state when there is no recent activity', () => {
    render(
      <RecentActivityCard
        latestPlayedAt={null}
        timeZone="America/New_York"
        now={new Date('2026-04-21T05:00:00.000Z')}
      />,
    )

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })
})
