import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GameCard } from '@/components/GameCard'

const game = {
  id: 1,
  playedAt: new Date('2026-06-08T20:00:00Z'),
  notes: 'Three-way port battle',
  players: [
    { playerName: 'Elena', score: 9, isWinner: false },
    { playerName: 'Magnus', score: 11, isWinner: true },
    { playerName: 'Tom', score: 8, isWinner: false },
  ],
}

describe('GameCard', () => {
  it('renders an article with winner callout, players, scores, and notes', () => {
    const { container } = render(<GameCard game={game} />)

    expect(container.querySelector('article')).not.toBeNull()
    expect(screen.getByText('♛ Magnus')).toBeInTheDocument()
    expect(screen.getByText('Elena')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('Three-way port battle')).toBeInTheDocument()
  })

  it('sorts players by score descending', () => {
    render(<GameCard game={game} />)

    const items = screen.getAllByRole('listitem')

    expect(items[0]).toHaveTextContent('Magnus')
    expect(items[1]).toHaveTextContent('Elena')
    expect(items[2]).toHaveTextContent('Tom')
  })

  it('omits the winner callout when no winner is recorded', () => {
    render(
      <GameCard
        game={{
          ...game,
          notes: '',
          players: game.players.map((player) => ({ ...player, isWinner: false })),
        }}
      />,
    )

    expect(screen.queryByText(/♛/)).not.toBeInTheDocument()
  })
})
