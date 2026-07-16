import { describe, expect, it } from 'vitest';
import { buildPlayerColorMap, PLAYER_COLOR_COUNT } from '@/lib/player-colors';

describe('buildPlayerColorMap', () => {
  it('assigns colors by ascending id ordinal regardless of input order', () => {
    const fromOrdered = buildPlayerColorMap([3, 7, 9]);
    const fromShuffled = buildPlayerColorMap([9, 3, 7]);

    expect(fromOrdered.get(3)).toBe('var(--player-color-1)');
    expect(fromOrdered.get(7)).toBe('var(--player-color-2)');
    expect(fromOrdered.get(9)).toBe('var(--player-color-3)');
    expect(fromShuffled).toEqual(fromOrdered);
  });

  it('deduplicates repeated ids before assigning ordinals', () => {
    const map = buildPlayerColorMap([5, 5, 2, 2, 8]);

    expect(map.size).toBe(3);
    expect(map.get(2)).toBe('var(--player-color-1)');
    expect(map.get(5)).toBe('var(--player-color-2)');
    expect(map.get(8)).toBe('var(--player-color-3)');
  });

  it('wraps around the palette after the color count is exhausted', () => {
    const ids = Array.from({ length: PLAYER_COLOR_COUNT + 1 }, (_, i) => i + 1);
    const map = buildPlayerColorMap(ids);

    expect(map.get(1)).toBe('var(--player-color-1)');
    expect(map.get(PLAYER_COLOR_COUNT)).toBe(`var(--player-color-${PLAYER_COLOR_COUNT})`);
    expect(map.get(PLAYER_COLOR_COUNT + 1)).toBe('var(--player-color-1)');
  });

  it('is append-only: adding a higher id never shifts existing assignments', () => {
    const before = buildPlayerColorMap([1, 4, 6]);
    const after = buildPlayerColorMap([1, 4, 6, 20]);

    [1, 4, 6].forEach((id) => {
      expect(after.get(id)).toBe(before.get(id));
    });
    expect(after.get(20)).toBe('var(--player-color-4)');
  });
});
