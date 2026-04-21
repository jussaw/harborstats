import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDeleteButton } from '@/app/admin/ConfirmDeleteButton'

describe('ConfirmDeleteButton', () => {
  it('blocks submit when confirmation is rejected', () => {
    const formAction = vi.fn().mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(
      <ConfirmDeleteButton
        formAction={formAction}
        hiddenFields={{ id: '42' }}
        confirmMessage="Delete this game?"
        label="Delete"
        className="text-red-500"
      />,
    )

    fireEvent.submit(screen.getByRole('button', { name: 'Delete' }).closest('form'))

    expect(confirmSpy).toHaveBeenCalledWith('Delete this game?')
    expect(formAction).not.toHaveBeenCalled()
  })

  it('allows submit when confirmation is accepted', () => {
    const formAction = vi.fn().mockResolvedValue(undefined)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(
      <ConfirmDeleteButton
        formAction={formAction}
        hiddenFields={{ id: '42' }}
        confirmMessage="Delete this game?"
        label="Delete"
        className="text-red-500"
      />,
    )

    fireEvent.submit(screen.getByRole('button', { name: 'Delete' }).closest('form'))

    expect(confirmSpy).toHaveBeenCalledWith('Delete this game?')
    expect(formAction).toHaveBeenCalledTimes(1)
  })
})
