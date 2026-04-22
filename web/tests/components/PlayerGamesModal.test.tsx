import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PlayerGamesModal } from '@/components/PlayerGamesModal'
import { PlayerTier } from '@/lib/player-tier'

describe('PlayerGamesModal', () => {
  const player = {
    id: 2,
    name: 'Bea',
    tier: PlayerTier.Standard,
    createdAt: new Date('2026-01-02T00:00:00.000Z'),
  }

  const games = [
    {
      id: 12,
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      notes: 'Harbor rematch',
      players: [
        { playerName: 'Ada', score: 7, isWinner: false },
        { playerName: 'Bea', score: 11, isWinner: true },
      ],
    },
    {
      id: 9,
      playedAt: new Date('2026-04-19T18:00:00.000Z'),
      notes: '',
      players: [
        { playerName: 'Bea', score: 8, isWinner: false },
        { playerName: 'Cara', score: 9, isWinner: true },
      ],
    },
  ]

  it('opens a dialog with full game cards and highlights the selected player', async () => {
    const user = userEvent.setup()

    render(<PlayerGamesModal player={player} games={games} />)

    expect(screen.getByRole('button', { name: 'View Games (2)' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Games for Bea' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'View Games (2)' }))

    const dialog = screen.getByRole('dialog', { name: 'Games for Bea' })
    expect(dialog).toHaveAttribute('open')
    const cards = within(dialog).getAllByRole('article')

    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByText('Harbor rematch')).toBeInTheDocument()
    expect(within(cards[1]).queryByText('Harbor rematch')).not.toBeInTheDocument()

    const highlightedRow = within(cards[0]).getByText('Bea').closest('li')
    expect(highlightedRow).toHaveAttribute('data-selected-player', 'true')
    expect(within(cards[0]).getByText('Ada')).toBeInTheDocument()
    expect(within(cards[0]).getByText('11')).toBeInTheDocument()
    expect(within(cards[1]).queryByText('Harbor rematch')).not.toBeInTheDocument()
  })

  it('closes from the close button and shows an empty state when there are no games', async () => {
    const user = userEvent.setup()

    const { rerender } = render(<PlayerGamesModal player={player} games={games} />)

    await user.click(screen.getByRole('button', { name: 'View Games (2)' }))
    const dialog = screen.getByRole('dialog', { name: 'Games for Bea' })

    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'))

    rerender(<PlayerGamesModal player={player} games={[]} />)

    await user.click(screen.getByRole('button', { name: 'View Games (0)' }))

    const emptyDialog = screen.getByRole('dialog', { name: 'Games for Bea' })
    expect(emptyDialog).toHaveAttribute('open')
    expect(within(emptyDialog).getByText('No games recorded yet.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dismiss dialog' }))
    await waitFor(() => expect(emptyDialog).not.toHaveAttribute('open'))
  })
})
