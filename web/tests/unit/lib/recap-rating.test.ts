import { describe, expect, it } from 'vitest';

import { PlayerTier } from '@/lib/player-tier';
import type { PlayerRating, RatingReplay } from '@/lib/rating';
import { formatRatingChange, getGameRatingImpacts } from '@/lib/recap-rating';

function makePlayer(overrides: Partial<PlayerRating> & Pick<PlayerRating, 'playerId'>): PlayerRating {
  return {
    playerId: overrides.playerId,
    name: overrides.name ?? `Player ${overrides.playerId}`,
    tier: overrides.tier ?? PlayerTier.Standard,
    rating: overrides.rating ?? 1500,
    displayRating: overrides.displayRating ?? 1500,
    peakRating: overrides.peakRating ?? 1500,
    lastGameChange: overrides.lastGameChange ?? 0,
    gamesPlayed: overrides.gamesPlayed ?? 0,
    provisional: overrides.provisional ?? true,
    history: overrides.history ?? [],
  };
}

describe('getGameRatingImpacts', () => {
  it('derives each participant pre/post change from their replay point for the game', () => {
    const replay: RatingReplay = {
      ratedGameCount: 1,
      players: [
        makePlayer({
          playerId: 1,
          history: [
            {
              gameId: 5,
              sequence: 0,
              playedAt: '2026-05-01T00:00:00.000Z',
              rating: 1512.4,
              change: 12.4,
              participated: true,
            },
          ],
        }),
        makePlayer({
          playerId: 2,
          history: [
            {
              gameId: 5,
              sequence: 0,
              playedAt: '2026-05-01T00:00:00.000Z',
              rating: 1487.6,
              change: -12.4,
              participated: true,
            },
          ],
        }),
      ],
    };

    const impacts = getGameRatingImpacts(replay, 5);

    expect(impacts.get(1)).toEqual({
      playerId: 1,
      ratingBefore: 1500,
      ratingAfter: 1512.4,
      change: 12.4,
    });
    expect(impacts.get(2)?.ratingBefore).toBeCloseTo(1500);
    expect(impacts.get(2)?.change).toBeCloseTo(-12.4);
  });

  it('excludes non-participants recorded as bystander history points', () => {
    const replay: RatingReplay = {
      ratedGameCount: 1,
      players: [
        makePlayer({
          playerId: 9,
          history: [
            {
              gameId: 5,
              sequence: 0,
              playedAt: '2026-05-01T00:00:00.000Z',
              rating: 1500,
              change: 0,
              participated: false,
            },
          ],
        }),
      ],
    };

    expect(getGameRatingImpacts(replay, 5).has(9)).toBe(false);
  });

  it('returns no entry for players the replay never rated in the game (unrated)', () => {
    const replay: RatingReplay = {
      ratedGameCount: 0,
      players: [makePlayer({ playerId: 1, history: [] })],
    };

    expect(getGameRatingImpacts(replay, 5).size).toBe(0);
  });

  it('only looks at the requested game id', () => {
    const replay: RatingReplay = {
      ratedGameCount: 2,
      players: [
        makePlayer({
          playerId: 1,
          history: [
            {
              gameId: 4,
              sequence: 0,
              playedAt: '2026-04-01T00:00:00.000Z',
              rating: 1520,
              change: 20,
              participated: true,
            },
            {
              gameId: 6,
              sequence: 1,
              playedAt: '2026-06-01T00:00:00.000Z',
              rating: 1510,
              change: -10,
              participated: true,
            },
          ],
        }),
      ],
    };

    expect(getGameRatingImpacts(replay, 5).size).toBe(0);
    expect(getGameRatingImpacts(replay, 6).get(1)?.change).toBe(-10);
  });
});

describe('formatRatingChange', () => {
  it('renders a textual sign so direction never relies on colour alone', () => {
    expect(formatRatingChange(12.4)).toBe('+12');
    expect(formatRatingChange(-7.6)).toBe('−8');
    expect(formatRatingChange(0)).toBe('±0');
    expect(formatRatingChange(0.2)).toBe('±0');
  });
});
