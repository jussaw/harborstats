import { describe, expect, it } from 'vitest';

import {
  createGamesSearchParams,
  hasActiveGamesPageFilters,
  parseGamesPageState,
} from '@/lib/games-page-filters';

describe('games page filter helpers', () => {
  it('parses page state and ignores invalid player and date query params', () => {
    const state = parseGamesPageState({
      page: '4',
      pageSize: '50',
      player: ['2', '0', '2', 'abc', '3.5'],
      from: 'not-a-date',
      to: '2026-04-20T15:16:00.000Z',
    });

    expect(state.page).toBe(4);
    expect(state.pageSize).toBe(50);
    expect(state.filters).toEqual({
      playerIds: [2],
      from: null,
      to: new Date('2026-04-20T15:16:00.000Z'),
    });
  });

  it('falls back to default paging and empty filters when params are missing', () => {
    const state = parseGamesPageState({});

    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(20);
    expect(state.filters).toEqual({ playerIds: [], from: null, to: null });
    expect(hasActiveGamesPageFilters(state.filters)).toBe(false);
  });

  it('serializes active filters into repeated player params and ISO datetimes', () => {
    const params = createGamesSearchParams({
      page: 2,
      pageSize: 50,
      filters: {
        playerIds: [7, 3],
        from: new Date('2026-04-01T10:00:00.000Z'),
        to: new Date('2026-04-20T15:16:00.000Z'),
      },
    });

    expect(params.get('page')).toBe('2');
    expect(params.get('pageSize')).toBe('50');
    expect(params.getAll('player')).toEqual(['7', '3']);
    expect(params.get('from')).toBe('2026-04-01T10:00:00.000Z');
    expect(params.get('to')).toBe('2026-04-20T15:16:00.000Z');
    expect(
      hasActiveGamesPageFilters({
        playerIds: [7, 3],
        from: new Date('2026-04-01T10:00:00.000Z'),
        to: null,
      }),
    ).toBe(true);
  });
});
