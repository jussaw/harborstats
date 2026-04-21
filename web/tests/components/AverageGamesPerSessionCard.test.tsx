import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AverageGamesPerSessionCard } from '@/components/AverageGamesPerSessionCard'

describe('AverageGamesPerSessionCard', () => {
  it('renders the local-time session average and supporting totals', () => {
    render(
      <AverageGamesPerSessionCard
        playedAtIsos={[
          '2026-04-21T01:30:00.000Z',
          '2026-04-21T03:15:00.000Z',
          '2026-04-21T14:00:00.000Z',
        ]}
        timeZone="America/New_York"
      />,
    )

    expect(screen.getByText('1.5')).toBeInTheDocument()
    expect(screen.getByText('2 sessions')).toBeInTheDocument()
    expect(screen.getByText('3 total games')).toBeInTheDocument()
    expect(
      screen.getByText('Session = games played on the same local calendar day.'),
    ).toBeInTheDocument()
  })

  it('renders an empty state with no games', () => {
    render(<AverageGamesPerSessionCard playedAtIsos={[]} timeZone="America/New_York" />)

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })
})
