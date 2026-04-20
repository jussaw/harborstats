import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Stepper } from '@/components/Stepper'

function Harness({ initial = 3, min = 0 }: { initial?: number; min?: number }) {
  const [value, setValue] = useState(initial)

  return <Stepper value={value} onChange={setValue} min={min} />
}

describe('Stepper', () => {
  it('increments and decrements the current value', () => {
    render(<Harness initial={3} />)

    const decrease = screen.getByLabelText('Decrease')
    const increase = screen.getByLabelText('Increase')
    const input = screen.getByRole('spinbutton')

    fireEvent.pointerDown(decrease)
    fireEvent.pointerUp(decrease)
    expect(input).toHaveValue(2)

    fireEvent.pointerDown(increase)
    fireEvent.pointerUp(increase)
    expect(input).toHaveValue(3)
  })

  it('clamps decrements at the minimum', () => {
    render(<Harness initial={0} min={0} />)

    const decrease = screen.getByLabelText('Decrease')
    const input = screen.getByRole('spinbutton')

    fireEvent.pointerDown(decrease)
    fireEvent.pointerUp(decrease)

    expect(input).toHaveValue(0)
  })

  it('normalizes blank input on blur', async () => {
    render(<Harness initial={Number.NaN} min={2} />)

    const input = screen.getByRole('spinbutton')

    fireEvent.blur(input)

    await waitFor(() => expect(input).toHaveValue(2))
  })
})
