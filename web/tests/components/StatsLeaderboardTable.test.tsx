import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  StatsLeaderboardTable,
  type StatsTableColumn,
  type StatsTableRow,
} from '@/components/StatsLeaderboardTable'

const columns: StatsTableColumn[] = [
  { label: '#', align: 'center', widthClass: 'w-10', rank: true },
  { label: 'Player', sortKey: 'player', sortType: 'string' },
  { label: 'Wins', align: 'right', sortKey: 'wins' },
]

// Wins values are distinct from rank numbers (1/2/3) so per-row lookups never collide.
const players = [
  { id: 1, name: 'Bob', wins: 10 },
  { id: 2, name: 'Ann', wins: 30 },
  { id: 3, name: 'Cy', wins: 20 },
]

function buildRows(): StatsTableRow[] {
  return players.map((player) => ({
    key: player.id,
    sortValues: { player: player.name, wins: player.wins },
    cells: (
      <>
        <td>{player.name}</td>
        <td>{player.wins}</td>
      </>
    ),
  }))
}

function renderTable() {
  return render(
    <StatsLeaderboardTable
      columns={columns}
      rows={buildRows()}
      initialSort={{ key: 'wins', direction: 'desc' }}
    />,
  )
}

function dataRowNames() {
  // Skip the header row, then read the player name from each data row.
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getByText(/Ann|Bob|Cy/).textContent)
}

describe('StatsLeaderboardTable', () => {
  it('renders rows in the initial sort order with a crown on rank one', () => {
    renderTable()

    expect(dataRowNames()).toEqual(['Ann', 'Cy', 'Bob'])

    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('👑')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Ann')).toBeInTheDocument()

    const winsHeader = screen.getByRole('columnheader', { name: /Wins/ })
    expect(winsHeader).toHaveAttribute('aria-sort', 'descending')
    expect(screen.getByRole('columnheader', { name: 'Player' })).toHaveAttribute('aria-sort', 'none')
  })

  it('does not make the rank column a sortable button', () => {
    renderTable()

    expect(screen.queryByRole('button', { name: '#' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('toggles direction when the active header is clicked again', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: 'Wins' }))

    expect(dataRowNames()).toEqual(['Bob', 'Cy', 'Ann'])
    expect(screen.getByRole('columnheader', { name: /Wins/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    // Ranks stay fixed to the default wins-desc order, so the crown stays on Ann (the
    // wins leader, now the last row) and Bob keeps rank 3 instead of being renumbered 1.
    const rows = screen.getAllByRole('row')
    expect(within(rows[3]).getByText('👑')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Ann')).toBeInTheDocument()
    expect(within(rows[1]).getByText('3')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Bob')).toBeInTheDocument()
  })

  it('keeps rank numbers tied to the default metric when sorting by another column', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: 'Player' }))

    expect(dataRowNames()).toEqual(['Ann', 'Bob', 'Cy'])

    // Rows reorder by player name, but the rank column still reflects wins: Ann=1 (👑),
    // Cy=2, Bob=3 — it does not follow the active Player sort.
    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('👑')).toBeInTheDocument()
    expect(within(rows[2]).getByText('3')).toBeInTheDocument()
    expect(within(rows[2]).getByText('Bob')).toBeInTheDocument()
    expect(within(rows[3]).getByText('2')).toBeInTheDocument()
    expect(within(rows[3]).getByText('Cy')).toBeInTheDocument()
  })

  it('sorts by a different column and moves the active sort indicator', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('button', { name: 'Player' }))

    expect(dataRowNames()).toEqual(['Ann', 'Bob', 'Cy'])
    expect(screen.getByRole('columnheader', { name: 'Player' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('columnheader', { name: 'Wins' })).toHaveAttribute('aria-sort', 'none')
  })

  it('renders a spanning empty state when there are no rows', () => {
    render(
      <StatsLeaderboardTable
        columns={columns}
        rows={[]}
        initialSort={{ key: 'wins', direction: 'desc' }}
        emptyState="Nothing here yet."
      />,
    )

    expect(screen.getByText('Nothing here yet.')).toBeInTheDocument()
    expect(screen.queryByText('👑')).not.toBeInTheDocument()
  })

  describe('pinBottom rows', () => {
    // Pins Ann — the wins leader — so pinning visibly overrides the sort value.
    function buildRowsWithPinnedAnn() {
      return buildRows().map((row) => (row.key === 2 ? { ...row, pinBottom: true } : row))
    }

    function renderPinnedTable() {
      return render(
        <StatsLeaderboardTable
          columns={columns}
          rows={buildRowsWithPinnedAnn()}
          initialSort={{ key: 'wins', direction: 'desc' }}
        />,
      )
    }

    it('sorts pinned rows last and ranks them after unpinned rows', () => {
      renderPinnedTable()

      expect(dataRowNames()).toEqual(['Cy', 'Bob', 'Ann'])

      // The crown moves to the top unpinned row; pinned Ann takes the trailing rank.
      const rows = screen.getAllByRole('row')
      expect(within(rows[1]).getByText('👑')).toBeInTheDocument()
      expect(within(rows[1]).getByText('Cy')).toBeInTheDocument()
      expect(within(rows[3]).getByText('3')).toBeInTheDocument()
      expect(within(rows[3]).getByText('Ann')).toBeInTheDocument()
    })

    it('keeps pinned rows last when the sort direction toggles', async () => {
      const user = userEvent.setup()
      renderPinnedTable()

      await user.click(screen.getByRole('button', { name: 'Wins' }))

      expect(dataRowNames()).toEqual(['Bob', 'Cy', 'Ann'])
    })

    it('keeps pinned rows last when sorting by another column', async () => {
      const user = userEvent.setup()
      renderPinnedTable()

      await user.click(screen.getByRole('button', { name: 'Player' }))

      // Ann sorts first alphabetically but stays pinned to the bottom.
      expect(dataRowNames()).toEqual(['Bob', 'Cy', 'Ann'])
    })

    it('does not share a rank across the pinned boundary on tied values', () => {
      const rows: StatsTableRow[] = [
        { key: 1, pinBottom: true, sortValues: { player: 'Ann', wins: 30 }, cells: <td>Ann</td> },
        { key: 2, sortValues: { player: 'Bob', wins: 30 }, cells: <td>Bob</td> },
        { key: 3, sortValues: { player: 'Cy', wins: 20 }, cells: <td>Cy</td> },
      ]
      render(
        <StatsLeaderboardTable
          columns={columns}
          rows={rows}
          initialSort={{ key: 'wins', direction: 'desc' }}
        />,
      )

      // Pinned Ann ties Bob on wins but ranks 3, not a shared 1.
      const renderedRows = screen.getAllByRole('row')
      expect(within(renderedRows[1]).getByText('👑')).toBeInTheDocument()
      expect(within(renderedRows[1]).getByText('Bob')).toBeInTheDocument()
      expect(within(renderedRows[3]).getByText('3')).toBeInTheDocument()
      expect(within(renderedRows[3]).getByText('Ann')).toBeInTheDocument()
    })
  })
})
