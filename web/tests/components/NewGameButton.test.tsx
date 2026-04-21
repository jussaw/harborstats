import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewGameButton } from '@/components/NewGameButton'
import { PlayerTier } from '@/lib/player-tier'

const { refreshMock } = vi.hoisted(() => ({
  refreshMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

vi.mock('@/app/actions', () => ({
  createGameAction: vi.fn(),
}))

vi.mock('@/components/GameForm', () => ({
  GameForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={() => onSuccess?.()}>
      Complete game
    </button>
  ),
}))

const players = [
  { id: 1, name: 'Alice', tier: PlayerTier.Premium },
]

describe('NewGameButton', () => {
  beforeEach(() => {
    refreshMock.mockReset()
  })

  it('opens and closes the dialog', async () => {
    const user = userEvent.setup()

    render(<NewGameButton players={players} className="text-sm" />)

    const openButton = screen.getByRole('button', { name: /\+ new game/i })
    await user.click(openButton)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(dialog).not.toHaveAttribute('open')
  })

  it('closes the dialog and refreshes after a successful submit', async () => {
    const user = userEvent.setup()

    render(<NewGameButton players={players} className="text-sm" />)

    await user.click(screen.getByRole('button', { name: /\+ new game/i }))
    const dialog = screen.getByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Complete game' }))

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'))
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })
})
