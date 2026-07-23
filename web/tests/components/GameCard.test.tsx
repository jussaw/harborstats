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
  it('renders an article with players, scores, and notes', () => {
    const { container } = render(<GameCard game={game} />)

    expect(container.querySelector('article')).not.toBeNull()
    expect(screen.getByText('Elena')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()
    expect(screen.getByText('Three-way port battle')).toBeInTheDocument()
  })

  it('marks only the winner row with the crown', () => {
    render(<GameCard game={game} />)

    const winnerRow = screen.getByText('♛').closest('li')
    expect(winnerRow).toHaveTextContent('Magnus')
    expect(winnerRow).toHaveTextContent('11')
    expect(screen.getAllByText(/♛/)).toHaveLength(1)
  })

  it('sorts players by score descending', () => {
    render(<GameCard game={game} />)

    const items = screen.getAllByRole('listitem')

    expect(items[0]).toHaveTextContent('Magnus')
    expect(items[1]).toHaveTextContent('Elena')
    expect(items[2]).toHaveTextContent('Tom')
  })

  it('is a plain article with no recap link by default', () => {
    const { container } = render(<GameCard game={game} />)

    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelector('article')).not.toBeNull()
  })

  it('links to its recap while keeping the article text content when href is set', () => {
    const { container } = render(<GameCard game={game} href />)

    const link = container.querySelector('a')
    expect(link).not.toBeNull()
    expect(link).toHaveAttribute('href', '/games/1')
    const article = link?.querySelector('article')
    expect(article).not.toBeNull()
    expect(article).toHaveTextContent('Magnus')
    expect(article).toHaveTextContent('11')
    expect(article).toHaveTextContent('Three-way port battle')
  })

  it('omits the crown when no winner is recorded', () => {
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
