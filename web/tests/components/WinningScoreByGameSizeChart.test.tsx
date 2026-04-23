import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { WinningScoreByGameSizeChart } from '@/components/WinningScoreByGameSizeChart'

describe('WinningScoreByGameSizeChart', () => {
  it('reveals bucket details on hover and focus', async () => {
    const user = userEvent.setup()

    render(
      <WinningScoreByGameSizeChart
        buckets={[
          { playerCount: 3, gameCount: 2, avgWinningScore: 9 },
          { playerCount: 4, gameCount: 1, avgWinningScore: 12 },
          { playerCount: 5, gameCount: 3, avgWinningScore: 10.7 },
        ]}
      />,
    )

    const detailSlot = screen.getByTestId('stats-card-detail-slot')

    expect(detailSlot).toHaveAttribute('data-detail-size', 'compact')
    expect(screen.getByText('Hover over a bar to inspect a game-size bucket.')).toBeInTheDocument()
    expect(screen.getByText('3P')).toBeInTheDocument()
    expect(screen.getByText('4P')).toBeInTheDocument()
    expect(screen.getByText('5P')).toBeInTheDocument()

    const fourPlayerBucket = screen.getByRole('button', { name: '4P: 12.0 average winning score across 1 game' })

    await user.hover(fourPlayerBucket)

    expect(within(detailSlot).getByText('4P')).toBeInTheDocument()
    expect(within(detailSlot).getByText('12.0 avg winning score')).toBeInTheDocument()
    expect(within(detailSlot).getByText('1 game')).toBeInTheDocument()

    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Winning score by game size' }))
    expect(screen.getByText('Hover over a bar to inspect a game-size bucket.')).toBeInTheDocument()

    fireEvent.focus(fourPlayerBucket)
    expect(within(detailSlot).getByText('12.0 avg winning score')).toBeInTheDocument()
    fireEvent.blur(fourPlayerBucket)
    expect(screen.getByText('Hover over a bar to inspect a game-size bucket.')).toBeInTheDocument()
  })

  it('renders an empty state with no buckets', () => {
    render(<WinningScoreByGameSizeChart buckets={[]} />)

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument()
  })
})
