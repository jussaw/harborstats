import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PlayerRow } from '@/components/PlayerRow'
import { PlayerTier } from '@/lib/player-tier'

const players = [
  { id: 1, name: 'Alice', tier: PlayerTier.Premium },
  { id: 2, name: 'Bob', tier: PlayerTier.Standard },
  { id: 3, name: 'Cara', tier: PlayerTier.Standard },
]

describe('PlayerRow', () => {
  it('renders premium and standard players in separate groups inside the picker', async () => {
    const user = userEvent.setup()

    render(
      <PlayerRow
        value={{ playerId: null, score: null, isWinner: false }}
        onChange={vi.fn()}
        players={players}
        selectedPlayerIds={[]}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Player' }))

    expect(screen.getByRole('group', { name: 'Premium' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Standard' })).toBeInTheDocument()
  })

  it('disables players already chosen in other rows while keeping the current selection enabled', async () => {
    const user = userEvent.setup()

    render(
      <PlayerRow
        value={{ playerId: 1, score: 0, isWinner: false }}
        onChange={vi.fn()}
        players={players}
        selectedPlayerIds={[1, 2]}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Player' }))

    expect(screen.getByRole('option', { name: 'Alice' })).not.toBeDisabled()
    expect(screen.getByRole('option', { name: 'Bob' })).toBeDisabled()
  })

  it('opens a searchable player picker and filters results as you type', async () => {
    const user = userEvent.setup()

    render(
      <PlayerRow
        value={{ playerId: null, score: null, isWinner: false }}
        onChange={vi.fn()}
        players={players}
        selectedPlayerIds={[]}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Player' }))

    const searchInput = screen.getByRole('textbox', { name: 'Player' })
    await user.type(searchInput, 'ca')

    expect(screen.getByRole('option', { name: 'Cara' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Alice' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Bob' })).not.toBeInTheDocument()
  })

  it('selects a player and keeps the grouped result lists visible while open', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PlayerRow
        value={{ playerId: null, score: null, isWinner: false }}
        onChange={onChange}
        players={players}
        selectedPlayerIds={[]}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Player' }))
    await user.click(screen.getByRole('option', { name: 'Bob' }))

    expect(onChange).toHaveBeenCalledWith({ playerId: 2, score: 0, isWinner: false })
  })

  it('shows a clear action for an existing selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <PlayerRow
        value={{ playerId: 2, score: 7, isWinner: false }}
        onChange={onChange}
        players={players}
        selectedPlayerIds={[2]}
      />,
    )

    await user.click(screen.getByRole('combobox', { name: 'Player' }))

    const standardGroup = screen.getByRole('group', { name: 'Standard' })
    expect(within(standardGroup).getByRole('option', { name: 'Bob' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear player' }))

    expect(onChange).toHaveBeenCalledWith({ playerId: null, score: null, isWinner: false })
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
