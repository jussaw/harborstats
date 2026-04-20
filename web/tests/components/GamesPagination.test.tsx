import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GamesPagination } from '@/components/GamesPagination'

function getPaginationStrip() {
  return screen.getByTestId('games-pagination-strip')
}

function getPaginationSlots() {
  return screen.getAllByTestId('games-pagination-slot')
}

describe('GamesPagination', () => {
  it('renders page-size links that reset to page 1', () => {
    render(
      <GamesPagination
        page={3}
        pageSize={50}
        totalPages={5}
        filters={{
          playerIds: [2, 5],
          from: new Date('2026-04-01T10:00:00.000Z'),
          to: new Date('2026-04-20T15:16:00.000Z'),
        }}
      />,
    )

    expect(screen.getByRole('link', { name: '20' })).toHaveAttribute(
      'href',
      '/games?page=1&pageSize=20&player=2&player=5&from=2026-04-01T10%3A00%3A00.000Z&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByRole('link', { name: '50' })).toHaveAttribute(
      'href',
      '/games?page=1&pageSize=50&player=2&player=5&from=2026-04-01T10%3A00%3A00.000Z&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByRole('link', { name: '100' })).toHaveAttribute(
      'href',
      '/games?page=1&pageSize=100&player=2&player=5&from=2026-04-01T10%3A00%3A00.000Z&to=2026-04-20T15%3A16%3A00.000Z',
    )
  })

  it('renders previous next and nearby numbered page links', () => {
    render(
      <GamesPagination
        page={4}
        pageSize={20}
        totalPages={8}
        filters={{ playerIds: [9], from: null, to: new Date('2026-04-20T15:16:00.000Z') }}
      />,
    )

    expect(screen.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      '/games?page=3&pageSize=20&player=9&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByText('←').closest('a')).toHaveAttribute(
      'href',
      '/games?page=3&pageSize=20&player=9&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      '/games?page=5&pageSize=20&player=9&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByText('→').closest('a')).toHaveAttribute(
      'href',
      '/games?page=5&pageSize=20&player=9&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute(
      'href',
      '/games?page=1&pageSize=20&player=9&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByRole('link', { name: '3' })).toHaveAttribute(
      'href',
      '/games?page=3&pageSize=20&player=9&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByRole('link', { name: '5' })).toHaveAttribute(
      'href',
      '/games?page=5&pageSize=20&player=9&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByRole('link', { name: '8' })).toHaveAttribute(
      'href',
      '/games?page=8&pageSize=20&player=9&to=2026-04-20T15%3A16%3A00.000Z',
    )
    expect(screen.getByText('4')).toHaveAttribute('aria-current', 'page')
  })

  it('disables previous and next on the edges', () => {
    render(<GamesPagination page={1} pageSize={20} totalPages={1} filters={{ playerIds: [], from: null, to: null }} />)

    expect(screen.getByText('←').parentElement).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('←').parentElement).toHaveAttribute('aria-label', 'Previous')
    expect(screen.getByText('→').parentElement).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('→').parentElement).toHaveAttribute('aria-label', 'Next')
  })

  it.each([
    { page: 1, expectedLinks: ['1', '2', '3', '4', '5', '6'], currentPage: '1' },
    { page: 2, expectedLinks: ['1', '2', '3', '4', '5', '6'], currentPage: '2' },
    { page: 3, expectedLinks: ['1', '2', '3', '4', '5', '6'], currentPage: '3' },
  ])('renders a fixed seven-slot strip for six total pages on page $page', ({ page, expectedLinks, currentPage }) => {
    render(<GamesPagination page={page} pageSize={20} totalPages={6} filters={{ playerIds: [], from: null, to: null }} />)

    expect(getPaginationSlots()).toHaveLength(7)
    expect(getPaginationStrip().querySelectorAll('[data-slot-type="placeholder"]')).toHaveLength(1)
    expect(getPaginationStrip().querySelectorAll('[data-slot-type="ellipsis"]')).toHaveLength(0)

    for (const label of expectedLinks) {
      if (label === currentPage) {
        expect(screen.getByText(label)).toHaveAttribute('aria-current', 'page')
      } else {
        expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', `/games?page=${label}&pageSize=20`)
      }
    }
  })

  it.each([
    {
      name: 'near the start',
      page: 2,
      expectedLinks: ['1', '2', '3', '4', '5', '10'],
      expectedCurrentPage: '2',
      expectedEllipses: 1,
    },
    {
      name: 'in the middle',
      page: 5,
      expectedLinks: ['1', '4', '5', '6', '10'],
      expectedCurrentPage: '5',
      expectedEllipses: 2,
    },
    {
      name: 'near the end',
      page: 9,
      expectedLinks: ['1', '6', '7', '8', '9', '10'],
      expectedCurrentPage: '9',
      expectedEllipses: 1,
    },
  ])('renders a fixed seven-slot strip for ten total pages $name', ({
    page,
    expectedLinks,
    expectedCurrentPage,
    expectedEllipses,
  }) => {
    render(<GamesPagination page={page} pageSize={20} totalPages={10} filters={{ playerIds: [], from: null, to: null }} />)

    expect(getPaginationSlots()).toHaveLength(7)
    expect(getPaginationStrip().querySelectorAll('[data-slot-type="ellipsis"]')).toHaveLength(expectedEllipses)
    expect(getPaginationStrip().querySelectorAll('[data-slot-type="placeholder"]')).toHaveLength(0)

    for (const label of expectedLinks) {
      if (label === expectedCurrentPage) {
        expect(screen.getByText(label)).toHaveAttribute('aria-current', 'page')
      } else {
        expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', `/games?page=${label}&pageSize=20`)
      }
    }
  })
})
