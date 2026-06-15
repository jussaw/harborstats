import { describe, expect, it } from 'vitest'

import { matchesWildcard } from '@/lib/wildcard'

describe('matchesWildcard', () => {
  it('matches everything for an empty or whitespace query', () => {
    expect(matchesWildcard('Average Score', '')).toBe(true)
    expect(matchesWildcard('Average Score', '   ')).toBe(true)
  })

  it('does a case-insensitive substring match when there are no wildcards', () => {
    expect(matchesWildcard('Average Score', 'score')).toBe(true)
    expect(matchesWildcard('Average Score', 'SCORE')).toBe(true)
    expect(matchesWildcard('Average Score', 'avg')).toBe(false)
  })

  it('treats * as any sequence of characters (anchored)', () => {
    expect(matchesWildcard('Score Histogram', 'score*')).toBe(true)
    expect(matchesWildcard('Average Score', 'score*')).toBe(false)
    expect(matchesWildcard('Closest Rivalry', '*rivalry*')).toBe(true)
    expect(matchesWildcard('Most Lopsided Rivalry', '*rivalry')).toBe(true)
  })

  it('treats ? as a single character (anchored)', () => {
    expect(matchesWildcard('Tier Showdown', 't?er*')).toBe(true)
    expect(matchesWildcard('Tier Showdown', 't?er')).toBe(false)
  })

  it('escapes regex metacharacters in the query', () => {
    expect(matchesWildcard('Winning vs Losing Score', 'winning vs*')).toBe(true)
    expect(matchesWildcard('A.B', 'a.b')).toBe(true)
    expect(matchesWildcard('AxB', 'a.b')).toBe(false)
  })
})
