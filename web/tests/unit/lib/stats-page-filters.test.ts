import { describe, expect, it } from 'vitest';

import {
  createStatsSearchParams,
  parseStatsSelectedPlayerIds,
} from '@/lib/stats-page-filters';

const ALL_PLAYER_IDS = [1, 2, 3];

describe('stats page filter helpers', () => {
  describe('parseStatsSelectedPlayerIds', () => {
    it('defaults to every player when no param is present', () => {
      expect(parseStatsSelectedPlayerIds(undefined, ALL_PLAYER_IDS)).toEqual([1, 2, 3]);
    });

    it('treats the "none" sentinel as an empty selection', () => {
      expect(parseStatsSelectedPlayerIds('none', ALL_PLAYER_IDS)).toEqual([]);
      expect(parseStatsSelectedPlayerIds(['none'], ALL_PLAYER_IDS)).toEqual([]);
    });

    it('parses a subset, deduping and ignoring invalid or unknown ids', () => {
      expect(
        parseStatsSelectedPlayerIds(['2', '0', '2', 'abc', '3.5', '99'], ALL_PLAYER_IDS),
      ).toEqual([2]);
    });

    it('parses the hyphen-delimited form', () => {
      expect(parseStatsSelectedPlayerIds('2-3', ALL_PLAYER_IDS)).toEqual([2, 3]);
    });

    it('ignores invalid or unknown segments in a delimited value', () => {
      expect(parseStatsSelectedPlayerIds('2-abc-0-99-2', ALL_PLAYER_IDS)).toEqual([2]);
    });

    it('parses a mix of delimited and legacy repeated values', () => {
      expect(parseStatsSelectedPlayerIds(['1-2', '3'], ALL_PLAYER_IDS)).toEqual([1, 2, 3]);
    });

    it('returns an empty selection when every referenced id is stale', () => {
      expect(parseStatsSelectedPlayerIds(['99'], ALL_PLAYER_IDS)).toEqual([]);
    });
  });

  describe('createStatsSearchParams', () => {
    it('keeps the URL clean when the full roster is selected', () => {
      expect(createStatsSearchParams([3, 2, 1], ALL_PLAYER_IDS).toString()).toBe('');
    });

    it('writes the "none" sentinel for an empty selection', () => {
      const params = createStatsSearchParams([], ALL_PLAYER_IDS);
      expect(params.get('player')).toBe('none');
    });

    it('writes a single hyphen-delimited player param for a subset', () => {
      const params = createStatsSearchParams([1, 3], ALL_PLAYER_IDS);
      expect(params.getAll('player')).toEqual(['1-3']);
      expect(params.toString()).toBe('player=1-3');
    });
  });
});
