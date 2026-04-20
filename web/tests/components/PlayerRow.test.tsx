import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PlayerRow } from '@/components/PlayerRow'
import { PlayerTier } from '@/lib/player-tier'

const players = [
  { id: 1, name: 'Alice', tier: PlayerTier.Premium },
  { id: 2, name: 'Bob', tier: PlayerTier.Standard },
]

describe('PlayerRow', () => {
  it('renders premium and standard players in separate optgroups', () => {
    render(
      <PlayerRow
        value={{ playerId: null, score: null, isWinner: false }}
        onChange={vi.fn()}
        players={players}
        selectedPlayerIds={[]}
      />,
    )

    const select = screen.getByRole('combobox', { name: 'Player' })

    expect(select.querySelector('optgroup[label="Premium"]')).not.toBeNull()
    expect(select.querySelector('optgroup[label="Standard"]')).not.toBeNull()
  })

  it('disables players already chosen in other rows while keeping the current selection enabled', () => {
    render(
      <PlayerRow
        value={{ playerId: 1, score: 0, isWinner: false }}
        onChange={vi.fn()}
        players={players}
        selectedPlayerIds={[1, 2]}
      />,
    )

    expect(screen.getByRole('option', { name: 'Alice' })).not.toBeDisabled()
    expect(screen.getByRole('option', { name: 'Bob' })).toBeDisabled()
  })

  it('renders a score dropdown with 0 through 20 options', () => {
    render(
      <PlayerRow
        value={{ playerId: 1, score: 10, isWinner: false }}
        onChange={vi.fn()}
        players={players}
        selectedPlayerIds={[1]}
      />,
    )

    const scoreSelect = screen.getByRole('combobox', { name: 'Score' })

    expect(screen.getByRole('option', { name: '0' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '20' })).toBeInTheDocument()
    expect(scoreSelect).toHaveValue('10')
  })

  it('keeps an out-of-range saved score selectable while editing', () => {
    render(
      <PlayerRow
        value={{ playerId: 1, score: 21, isWinner: false }}
        onChange={vi.fn()}
        players={players}
        selectedPlayerIds={[1]}
      />,
    )

    const scoreSelect = screen.getByRole('combobox', { name: 'Score' })

    expect(screen.getByRole('option', { name: '21' })).toBeInTheDocument()
    expect(scoreSelect).toHaveValue('21')
  })

  it('disables the winner toggle until a player is selected', () => {
    render(
      <PlayerRow
        value={{ playerId: null, score: null, isWinner: false }}
        onChange={vi.fn()}
        players={players}
        selectedPlayerIds={[]}
      />,
    )

    expect(screen.getByRole('button', { name: /mark as winner/i })).toBeDisabled()
  })
})
