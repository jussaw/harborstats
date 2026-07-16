import { describe, expect, it } from 'vitest';
import { PlayerTier } from '@/lib/player-tier';
import type { PlayerRating, RatingHistoryPoint } from '@/lib/rating';
import {
  buildSequenceAxis,
  buildTooltipRows,
  getXAxisLabelSequences,
  highlightForY,
  nearestSequenceForX,
  splitProvisionalSegments,
} from '@/lib/rating-history-view';

function point(overrides: Partial<RatingHistoryPoint> & { sequence: number }): RatingHistoryPoint {
  return {
    gameId: overrides.sequence + 1,
    playedAt: `2026-03-0${overrides.sequence + 1}T00:00:00.000Z`,
    rating: 1500,
    change: 0,
    participated: true,
    ...overrides,
  };
}

function player(
  playerId: number,
  name: string,
  history: RatingHistoryPoint[],
): PlayerRating {
  return {
    playerId,
    name,
    tier: PlayerTier.Standard,
    rating: history.at(-1)?.rating ?? 1500,
    displayRating: Math.round(history.at(-1)?.rating ?? 1500),
    peakRating: Math.max(1500, ...history.map((entry) => entry.rating)),
    lastGameChange: history.at(-1)?.change ?? 0,
    gamesPlayed: history.filter((entry) => entry.participated).length,
    provisional: false,
    history,
  };
}

describe('buildSequenceAxis', () => {
  it('unions every series, including a late-joining player', () => {
    const ada = player(1, 'Ada', [point({ sequence: 0 }), point({ sequence: 1 }), point({ sequence: 2 })]);
    const bea = player(2, 'Bea', [point({ sequence: 1 }), point({ sequence: 2 })]);

    const axis = buildSequenceAxis([ada, bea]);

    expect(axis.map((entry) => entry.sequence)).toEqual([0, 1, 2]);
    expect(axis[1]).toMatchObject({ sequence: 1, gameId: 2, playedAt: '2026-03-02T00:00:00.000Z' });
  });
});

describe('splitProvisionalSegments', () => {
  it('splits at the Nth played game, skipping carried-forward snapshots', () => {
    const history = [
      point({ sequence: 0, participated: true }),
      point({ sequence: 1, participated: true }),
      point({ sequence: 2, participated: false }),
      point({ sequence: 3, participated: true }),
      point({ sequence: 4, participated: true }),
      point({ sequence: 5, participated: false }),
      point({ sequence: 6, participated: true }),
      point({ sequence: 7, participated: false }),
    ];

    const { provisional, established } = splitProvisionalSegments(history, 5);

    expect(provisional).toHaveLength(7);
    expect(provisional.at(-1)?.sequence).toBe(6);
    expect(established[0]?.sequence).toBe(6);
    expect(established.at(-1)?.sequence).toBe(7);
  });

  it('keeps the whole line provisional when N played games are never reached', () => {
    const history = [
      point({ sequence: 0, participated: true }),
      point({ sequence: 1, participated: false }),
      point({ sequence: 2, participated: true }),
    ];

    const { provisional, established } = splitProvisionalSegments(history, 5);

    expect(provisional).toBe(history);
    expect(established).toHaveLength(0);
  });
});

describe('buildTooltipRows', () => {
  const ada = player(1, 'Ada', [point({ sequence: 0, rating: 1500 }), point({ sequence: 1, rating: 1490 })]);
  const bea = player(2, 'Bea', [point({ sequence: 0, rating: 1500 }), point({ sequence: 1, rating: 1512 })]);
  const cid = player(3, 'Cid', [point({ sequence: 1, rating: 1505 })]);

  it('ranks visible players by rating descending at the sequence', () => {
    const rows = buildTooltipRows([ada, bea, cid], new Set(), 1);

    expect(rows.map((row) => row.name)).toEqual(['Bea', 'Cid', 'Ada']);
  });

  it('omits hidden players and players with no point at the sequence', () => {
    const rows = buildTooltipRows([ada, bea, cid], new Set([2]), 0);

    expect(rows.map((row) => row.name)).toEqual(['Ada']);
  });
});

describe('nearestSequenceForX', () => {
  const scale = { left: 40, plotWidth: 400, maxSequence: 10 };

  it('rounds to the nearest sequence', () => {
    expect(nearestSequenceForX(40, scale)).toBe(0);
    expect(nearestSequenceForX(240, scale)).toBe(5);
    expect(nearestSequenceForX(440, scale)).toBe(10);
    expect(nearestSequenceForX(59, scale)).toBe(0);
    expect(nearestSequenceForX(61, scale)).toBe(1);
  });

  it('clamps outside the plot and handles a single game', () => {
    expect(nearestSequenceForX(-100, scale)).toBe(0);
    expect(nearestSequenceForX(9999, scale)).toBe(10);
    expect(nearestSequenceForX(240, { left: 40, plotWidth: 400, maxSequence: 0 })).toBe(0);
  });
});

describe('highlightForY', () => {
  const candidates = [
    { playerId: 1, yView: 50 },
    { playerId: 2, yView: 90 },
  ];

  it('returns the nearest line within the threshold', () => {
    expect(highlightForY(candidates, 54, 20)).toBe(1);
    expect(highlightForY(candidates, 88, 20)).toBe(2);
  });

  it('includes a line exactly at the threshold and excludes beyond it', () => {
    expect(highlightForY(candidates, 70, 20)).toBe(1);
    expect(highlightForY(candidates, 120, 20)).toBeNull();
    expect(highlightForY(candidates, 30, 20)).toBe(1);
  });

  it('returns null when there are no candidates', () => {
    expect(highlightForY([], 50, 20)).toBeNull();
  });
});

describe('getXAxisLabelSequences', () => {
  const axisOf = (sequences: number[]) =>
    sequences.map((sequence) => ({
      sequence,
      gameId: sequence + 1,
      playedAt: `2026-03-0${sequence + 1}T00:00:00.000Z`,
    }));

  it('returns the first, middle, and last games present on the axis', () => {
    expect(getXAxisLabelSequences(axisOf([0, 1, 2, 3, 4, 5, 6, 7, 8]))).toEqual([0, 4, 8]);
  });

  it('labels the actual first game for a late-debuting single player', () => {
    // A player whose history starts at global sequence 3.
    expect(getXAxisLabelSequences(axisOf([3, 4, 5, 6, 7]))).toEqual([3, 5, 7]);
  });

  it('de-duplicates for very short series', () => {
    expect(getXAxisLabelSequences(axisOf([2]))).toEqual([2]);
    expect(getXAxisLabelSequences([])).toEqual([]);
  });
});
