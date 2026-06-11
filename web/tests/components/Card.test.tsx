import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

describe('Card', () => {
  it('renders header with title, description, and badge', () => {
    render(
      <Card title="Win Rate Leaders" description="Minimum 10 games" badge="Top 5">
        Body content
      </Card>,
    )

    expect(screen.getByRole('heading', { name: 'Win Rate Leaders' })).toBeInTheDocument()
    expect(screen.getByText('Minimum 10 games')).toBeInTheDocument()
    expect(screen.getByText('Top 5')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('renders without a header when no title is given', () => {
    render(<Card>Just content</Card>)

    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByText('Just content')).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge>Crown</Badge>)

    expect(screen.getByText('Crown')).toBeInTheDocument()
  })
})
