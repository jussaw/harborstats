import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GamesPagination } from '@/components/GamesPagination'

describe('GamesPagination', () => {
  it('renders page-size links that reset to page 1', () => {
    render(<GamesPagination page={3} pageSize={50} totalPages={5} />)

    expect(screen.getByRole('link', { name: '20' })).toHaveAttribute('href', '/games?page=1&pageSize=20')
    expect(screen.getByRole('link', { name: '50' })).toHaveAttribute('href', '/games?page=1&pageSize=50')
    expect(screen.getByRole('link', { name: '100' })).toHaveAttribute('href', '/games?page=1&pageSize=100')
  })

  it('renders previous next and nearby numbered page links', () => {
    render(<GamesPagination page={4} pageSize={20} totalPages={8} />)

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute('href', '/games?page=3&pageSize=20')
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute('href', '/games?page=5&pageSize=20')
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute('href', '/games?page=1&pageSize=20')
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute('href', '/games?page=3&pageSize=20')
    expect(screen.getByRole('link', { name: '5' })).toHaveAttribute('href', '/games?page=5&pageSize=20')
    expect(screen.getByRole('link', { name: '8' })).toHaveAttribute('href', '/games?page=8&pageSize=20')
    expect(screen.getByText('4')).toHaveAttribute('aria-current', 'page')
  })

  it('disables previous and next on the edges', () => {
    render(<GamesPagination page={1} pageSize={20} totalPages={1} />)

    expect(screen.getByText('Previous')).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Next')).toHaveAttribute('aria-disabled', 'true')
  })
})
