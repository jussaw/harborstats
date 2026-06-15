import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { StatsSearch, type StatsSectionView } from '@/components/StatsSearch'

const sections: StatsSectionView[] = [
  {
    id: 'scoring',
    title: 'Scoring',
    subtitle: 'How players score.',
    cards: [
      {
        id: 'avg-score',
        title: 'Average Score',
        description: '',
        badge: undefined,
        span: 'single',
        content: <div>avg content</div>,
      },
      {
        id: 'score-histogram',
        title: 'Score Histogram',
        description: '',
        badge: undefined,
        span: 'full',
        content: <div>histogram content</div>,
      },
    ],
  },
  {
    id: 'head-to-head',
    title: 'Head-to-Head',
    subtitle: 'Rivalries and matchups.',
    cards: [
      {
        id: 'closest-rivalry',
        title: 'Closest Rivalry',
        description: '',
        badge: undefined,
        span: 'single',
        content: <div>rivalry content</div>,
      },
    ],
  },
]

describe('StatsSearch', () => {
  it('renders every card title by default with no query', () => {
    render(<StatsSearch sections={sections} />)

    expect(screen.getByText('Average Score')).toBeInTheDocument()
    expect(screen.getByText('Score Histogram')).toBeInTheDocument()
    expect(screen.getByText('Closest Rivalry')).toBeInTheDocument()
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument()
  })

  it('filters cards by title as the user types', async () => {
    const user = userEvent.setup()
    render(<StatsSearch sections={sections} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search stats' }), 'score')

    expect(screen.getByText('Average Score')).toBeInTheDocument()
    expect(screen.getByText('Score Histogram')).toBeInTheDocument()
    expect(screen.queryByText('Closest Rivalry')).not.toBeInTheDocument()
  })

  it('supports wildcards in the query', async () => {
    const user = userEvent.setup()
    render(<StatsSearch sections={sections} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search stats' }), 'score*')

    expect(screen.getByText('Score Histogram')).toBeInTheDocument()
    expect(screen.queryByText('Average Score')).not.toBeInTheDocument()
  })

  it('matches card titles only, not section names', async () => {
    const user = userEvent.setup()
    render(<StatsSearch sections={sections} />)

    // 'head-to-head' is a section name but matches no card title.
    await user.type(screen.getByRole('searchbox', { name: 'Search stats' }), 'head-to-head')

    expect(screen.getByText(/no stats match/i)).toBeInTheDocument()
    expect(screen.queryByText('Closest Rivalry')).not.toBeInTheDocument()
  })

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup()
    render(<StatsSearch sections={sections} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search stats' }), 'zzz')

    expect(screen.getByText(/no stats match/i)).toBeInTheDocument()
    expect(screen.queryByText('Average Score')).not.toBeInTheDocument()
  })

  it('restores all cards when the query is cleared', async () => {
    const user = userEvent.setup()
    render(<StatsSearch sections={sections} />)

    await user.type(screen.getByRole('searchbox', { name: 'Search stats' }), 'zzz')
    await user.click(screen.getByLabelText('Clear search'))

    expect(screen.getByText('Average Score')).toBeInTheDocument()
    expect(screen.getByText('Closest Rivalry')).toBeInTheDocument()
    expect(screen.queryByText(/no stats match/i)).not.toBeInTheDocument()
  })
})
