import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LongestGapCard } from '@/components/LongestGapCard'

describe('LongestGapCard', () => {
  it('renders the longest idle-day gap and its boundary dates', () => {
    render(
      <LongestGapCard
        playedAtIsos={[
          '2026-04-20T15:00:00.000Z',
          '2026-04-20T23:00:00.000Z',
          '2026-04-22T15:00:00.000Z',
          '2026-04-24T15:00:00.000Z',
        ]}
        timeZone="America/New_York"
      />,
    )

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('idle day')).toBeInTheDocument()
    expect(screen.getByText('Apr 22, 2026')).toBeInTheDocument()
    expect(screen.getByText('Apr 24, 2026')).toBeInTheDocument()
  })

  it('renders a sparse state when fewer than two games exist', () => {
    render(
      <LongestGapCard
        playedAtIsos={['2026-04-20T15:00:00.000Z']}
        timeZone="America/New_York"
      />,
    )

    expect(screen.getByText('Need at least two games to calculate a gap.')).toBeInTheDocument()
  })
})
