/**
 * Rules the parity crawl applies, kept apart from the spec so they can be
 * unit-tested (tests/unit/scripts/parity-rules.test.ts).
 */

/**
 * Accepted difference 1 (README): in every table with a Player column, rows
 * that match in every cell except Player and rank (#) are compared with their
 * player cells in name order. The old app left such ties in Postgres' hash
 * order; the new app orders them by name.
 *
 * Self-contained on purpose: the crawl hands it to `page.evaluate`, which sends
 * only the function's source to the browser.
 */
export function normalizeTiedPlayerRows(root: ParentNode = document): void {
  const clean = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim()
  const byName = (a: HTMLTableCellElement, b: HTMLTableCellElement) => {
    const left = clean(a.textContent).toLowerCase()
    const right = clean(b.textContent).toLowerCase()
    if (left === right) return 0
    return left < right ? -1 : 1
  }

  root.querySelectorAll('table').forEach((table) => {
    const headerRow = table.tHead?.rows[0]
    const headers = headerRow ? Array.from(headerRow.cells, (cell) => clean(cell.textContent)) : []
    const playerColumn = headers.indexOf('Player')
    if (playerColumn < 0) return
    const rankColumn = headers.indexOf('#')
    const tieKey = (row: HTMLTableRowElement) =>
      Array.from(row.cells, (cell, i) =>
        i === playerColumn || i === rankColumn ? '' : clean(cell.textContent),
      ).join('|')

    Array.from(table.tBodies).forEach((body) => {
      const groups: HTMLTableRowElement[][] = []
      Array.from(body.rows).forEach((row) => {
        const last = groups[groups.length - 1]
        if (last && last[0].cells.length === row.cells.length && tieKey(last[0]) === tieKey(row)) {
          last.push(row)
        } else {
          groups.push([row])
        }
      })
      groups
        .filter((group) => group.length > 1)
        .forEach((group) => {
          const sorted = group
            .map((row) => row.cells[playerColumn])
            .sort(byName)
            .map((cell) => cell.cloneNode(true))
          group.forEach((row, i) => row.cells[playerColumn].replaceWith(sorted[i]))
        })
    })
  })
}

/** The write section changes both databases, so it only runs against apps on this machine. */
export function isLoopbackUrl(url: string): boolean {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return false
  }
  return host === 'localhost' || host === '[::1]' || /^127(\.\d{1,3}){3}$/.test(host)
}
