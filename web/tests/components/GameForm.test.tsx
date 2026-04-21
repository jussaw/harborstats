import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GameForm, type GameFormInitial } from '@/components/GameForm'
import { PlayerTier } from '@/lib/player-tier'

const players = [
  { id: 1, name: 'Alice', tier: PlayerTier.Premium },
  { id: 2, name: 'Bob', tier: PlayerTier.Standard },
]

function renderGameForm(initial?: GameFormInitial, action = vi.fn().mockResolvedValue(undefined), onSuccess = vi.fn()) {
  render(<GameForm action={action} players={players} initial={initial} onSuccess={onSuccess} />)

  return { action, onSuccess }
}

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

function submitGameForm() {
  const submitButton = screen.getByRole('button', { name: /save game/i })
  submitButton.form?.requestSubmit(submitButton)
}

describe('GameForm', () => {
  it('shows an error when a row is missing either a player or a score', async () => {
    renderGameForm({
      played_at: '2026-04-20T18:15:00.000Z',
      notes: '',
      rows: [{ playerId: 1, score: null, isWinner: false }],
    })

    submitGameForm()

    expect(
      await screen.findByText('Row 1: name and score must both be filled or both empty.'),
    ).toBeInTheDocument()
  })

  it('shows an error when a row has a score but no player', async () => {
    renderGameForm({
      played_at: '2026-04-20T18:15:00.000Z',
      notes: '',
      rows: [{ playerId: null, score: 7, isWinner: false }],
    })

    submitGameForm()

    expect(
      await screen.findByText('Row 1: name and score must both be filled or both empty.'),
    ).toBeInTheDocument()
  })

  it('shows an error when no rows are filled', async () => {
    const action = vi.fn().mockResolvedValue(undefined)
    renderGameForm(
      {
        played_at: '2026-04-20T18:15:00.000Z',
        notes: '',
        rows: [],
      },
      action,
    )

    submitGameForm()

    expect(await screen.findByText('Add at least one player before submitting.')).toBeInTheDocument()
    expect(action).not.toHaveBeenCalled()
  })

  it('shows an error when the same player appears twice', async () => {
    renderGameForm({
      played_at: '2026-04-20T18:15:00.000Z',
      notes: '',
      rows: [
        { playerId: 1, score: 10, isWinner: true },
        { playerId: 1, score: 8, isWinner: false },
      ],
    })

    submitGameForm()

    expect(
      await screen.findByText('Each player can only be selected once per game.'),
    ).toBeInTheDocument()
  })

  it('serializes row data and converts played_at before calling onSuccess', async () => {
    const actionGate = deferred()
    const action = vi.fn().mockReturnValue(actionGate.promise)
    const onSuccess = vi.fn()

    renderGameForm(
      {
        played_at: '2026-04-20T18:15:00.000Z',
        notes: 'Final table',
        rows: [
          { playerId: 1, score: 12, isWinner: true },
          { playerId: null, score: null, isWinner: false },
        ],
      },
      action,
      onSuccess,
    )

    const playedAtInput = screen.getByLabelText('Date & Time')
    const localPlayedAt = playedAtInput.value

    submitGameForm()

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1))
    expect(onSuccess).not.toHaveBeenCalled()

    const formData = action.mock.calls[0]?.[0]
    expect(formData).toBeInstanceOf(FormData)

    if (!(formData instanceof FormData)) {
      throw new Error('Expected GameForm to submit a FormData instance')
    }

    expect(formData.get('player_id_0')).toBe('1')
    expect(formData.get('score_0')).toBe('12')
    expect(formData.get('is_winner_0')).toBe('1')
    expect(formData.get('player_id_1')).toBe('')
    expect(formData.get('score_1')).toBe('')
    expect(String(formData.get('played_at'))).toMatch(/Z$/)
    expect(String(formData.get('played_at'))).not.toBe(localPlayedAt)

    actionGate.resolve()

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
  })
})
