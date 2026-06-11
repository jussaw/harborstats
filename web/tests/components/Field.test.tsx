import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Input, Label, Select, Textarea } from '@/components/ui/Field'

describe('Field primitives', () => {
  it('associates Label with Input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" name="password" />
      </>,
    )

    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('forwards Input changes', () => {
    const onChange = vi.fn()
    render(<Input aria-label="Search" value="" onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Search'), { target: { value: 'ada' } })

    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('renders Select options and supports aria-label lookup', () => {
    render(
      <Select aria-label="Score" defaultValue="8">
        <option value="8">8</option>
        <option value="10">10</option>
      </Select>,
    )

    const select = screen.getByRole('combobox', { name: 'Score' })

    expect(select).toHaveValue('8')
  })

  it('renders Textarea with placeholder', () => {
    render(<Textarea aria-label="Notes" placeholder="What happened?" />)

    expect(screen.getByPlaceholderText('What happened?')).toBeInTheDocument()
  })
})
