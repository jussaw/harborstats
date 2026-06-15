/**
 * Case-insensitive wildcard text matching used by the stats-page search.
 *
 * - An empty / whitespace-only query matches everything.
 * - `*` matches any sequence of characters, `?` matches a single character.
 * - When the query contains wildcards, it is anchored (e.g. `score*` is
 *   starts-with, `*rivalry*` is contains).
 * - When the query has no wildcards, it is treated as a substring match.
 */
export function matchesWildcard(text: string, query: string): boolean {
  const trimmed = query.trim().toLowerCase()

  if (trimmed === '') {
    return true
  }

  const haystack = text.toLowerCase()

  if (!trimmed.includes('*') && !trimmed.includes('?')) {
    return haystack.includes(trimmed)
  }

  const pattern = trimmed
    .split('')
    .map((char) => {
      if (char === '*') {
        return '.*'
      }

      if (char === '?') {
        return '.'
      }

      return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('')

  return new RegExp(`^${pattern}$`).test(haystack)
}
