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

const { unlockGameCreationActionMock } = vi.hoisted(() => ({
  unlockGameCreationActionMock: vi.fn(),
}))

vi.mock('@/app/actions/game-unlock', () => ({
  unlockGameCreationAction: unlockGameCreationActionMock,
}))

const players = [
  { id: 1, name: 'Alice', tier: PlayerTier.Premium },
]

describe('NewGameButton', () => {
  beforeEach(() => {
    refreshMock.mockReset()
    unlockGameCreationActionMock.mockReset()
    unlockGameCreationActionMock.mockResolvedValue({ ok: false })
  })

  it('opens and closes the dialog', async () => {
    const user = userEvent.setup()

    render(<NewGameButton players={players} className="text-sm" isUnlocked />)

    const openButton = screen.getByRole('button', { name: /\+ new game/i })
    await user.click(openButton)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('open')

    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(dialog).not.toHaveAttribute('open')
  })

  it('focuses the close button instead of the backdrop when the dialog opens', async () => {
    const user = userEvent.setup()

    render(<NewGameButton players={players} className="text-sm" isUnlocked />)

    await user.click(screen.getByRole('button', { name: /\+ new game/i }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus())
    expect(screen.getByRole('button', { name: 'Dismiss dialog' })).toHaveAttribute(
      'tabindex',
      '-1',
    )
  })

  it('closes the dialog and refreshes after a successful submit', async () => {
    const user = userEvent.setup()

    render(<NewGameButton players={players} className="text-sm" isUnlocked />)

    await user.click(screen.getByRole('button', { name: /\+ new game/i }))
    const dialog = screen.getByRole('dialog')

    await user.click(screen.getByRole('button', { name: 'Complete game' }))

    await waitFor(() => expect(dialog).not.toHaveAttribute('open'))
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  describe('when isUnlocked={false}', () => {
    it('shows the password form when dialog opens', async () => {
      const user = userEvent.setup()

      render(<NewGameButton players={players} className="text-sm" isUnlocked={false} />)

      await user.click(screen.getByRole('button', { name: /\+ new game/i }))

      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /complete game/i })).not.toBeInTheDocument()
    })

    it('shows an incorrect password error when the action returns error: incorrect', async () => {
      unlockGameCreationActionMock.mockResolvedValue({ ok: false, error: 'incorrect' })

      const user = userEvent.setup()

      render(<NewGameButton players={players} className="text-sm" isUnlocked={false} />)

      await user.click(screen.getByRole('button', { name: /\+ new game/i }))
      await user.type(screen.getByLabelText('Password'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /unlock/i }))

      await waitFor(() =>
        expect(screen.getByText(/incorrect password/i)).toBeInTheDocument(),
      )
    })

    it('shows a not-configured message when the action returns error: not-configured', async () => {
      unlockGameCreationActionMock.mockResolvedValue({ ok: false, error: 'not-configured' })

      const user = userEvent.setup()

      render(<NewGameButton players={players} className="text-sm" isUnlocked={false} />)

      await user.click(screen.getByRole('button', { name: /\+ new game/i }))
      await user.type(screen.getByLabelText('Password'), 'anything')
      await user.click(screen.getByRole('button', { name: /unlock/i }))

      await waitFor(() =>
        expect(
          screen.getByText(/no game password has been set yet/i),
        ).toBeInTheDocument(),
      )
    })

    it('switches to the game form after a successful unlock', async () => {
      unlockGameCreationActionMock.mockResolvedValue({ ok: true })

      const user = userEvent.setup()

      render(<NewGameButton players={players} className="text-sm" isUnlocked={false} />)

      await user.click(screen.getByRole('button', { name: /\+ new game/i }))
      await user.type(screen.getByLabelText('Password'), 'correctpassword')
      await user.click(screen.getByRole('button', { name: /unlock/i }))

      await waitFor(() =>
        expect(screen.getByRole('button', { name: /complete game/i })).toBeInTheDocument(),
      )
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
      expect(refreshMock).toHaveBeenCalled()
    })

    it('does not show a stale error message when the dialog is closed and reopened', async () => {
      unlockGameCreationActionMock.mockResolvedValueOnce({ ok: false, error: 'incorrect' })
      unlockGameCreationActionMock.mockResolvedValue({ ok: false })

      const user = userEvent.setup()

      render(<NewGameButton players={players} className="text-sm" isUnlocked={false} />)

      // Open the dialog and submit with a wrong password — error should appear
      await user.click(screen.getByRole('button', { name: /\+ new game/i }))
      await user.type(screen.getByLabelText('Password'), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /unlock/i }))

      await waitFor(() =>
        expect(screen.getByText(/incorrect password/i)).toBeInTheDocument(),
      )

      // Close and reopen — UnlockForm remounts with a fresh key, error must be gone
      await user.click(screen.getByRole('button', { name: 'Close' }))
      await user.click(screen.getByRole('button', { name: /\+ new game/i }))

      expect(screen.queryByText(/incorrect password/i)).not.toBeInTheDocument()
    })
  })

  describe('when isUnlocked', () => {
    it('shows the game form directly when dialog opens', async () => {
      const user = userEvent.setup()

      render(<NewGameButton players={players} className="text-sm" isUnlocked />)

      await user.click(screen.getByRole('button', { name: /\+ new game/i }))

      expect(screen.getByRole('button', { name: /complete game/i })).toBeInTheDocument()
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    })
  })
})
