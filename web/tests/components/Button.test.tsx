import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Button, buttonClasses } from '@/components/ui/Button'

describe('Button', () => {
  it('renders a type=button element with primary styling by default', () => {
    render(<Button>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })

    expect(button).toHaveAttribute('type', 'button')
    expect(button.className).toContain('bg-(image:--gradient-gold)')
  })

  it('renders type=submit when requested', () => {
    render(<Button type="submit">Save Game</Button>)

    expect(screen.getByRole('button', { name: 'Save Game' })).toHaveAttribute('type', 'submit')
  })

  it('applies variant and size classes', () => {
    render(
      <Button variant="danger" size="sm">
        Delete
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Delete' })

    expect(button.className).toContain('text-red-300')
    expect(button.className).toContain('text-xs')
  })

  it('fires onClick and respects disabled', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Go</Button>)

    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Go' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('exposes class builder for non-button call sites', () => {
    expect(buttonClasses('secondary', 'sm')).toContain('border-(--border-gold)')
  })
})
