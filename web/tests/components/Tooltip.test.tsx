import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Tooltip } from '@/components/ui/Tooltip'

describe('Tooltip', () => {
  it('renders the trigger and the bubble content with a tooltip role', () => {
    render(
      <Tooltip content="Helpful context">
        <button type="button">Trigger</button>
      </Tooltip>,
    )

    expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Helpful context')
  })

  it('centers the bubble by default and right-aligns it when requested', () => {
    const { rerender } = render(
      <Tooltip content="Centered">
        <span>Value</span>
      </Tooltip>,
    )
    expect(screen.getByRole('tooltip')).toHaveClass('left-1/2', 'w-56')

    rerender(
      <Tooltip content="Right" align="right" widthClass="w-48">
        <span>Value</span>
      </Tooltip>,
    )
    expect(screen.getByRole('tooltip')).toHaveClass('right-0', 'w-48')
  })
})
