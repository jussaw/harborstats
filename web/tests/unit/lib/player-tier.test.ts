import { describe, expect, it } from 'vitest';

import { parsePlayerTier, PlayerTier } from '@/lib/player-tier';

describe('parsePlayerTier', () => {
  it('returns premium for the premium tier value', () => {
    expect(parsePlayerTier('premium')).toBe(PlayerTier.Premium);
  });

  it('falls back to standard for missing or unknown values', () => {
    expect(parsePlayerTier('standard')).toBe(PlayerTier.Standard);
    expect(parsePlayerTier(undefined)).toBe(PlayerTier.Standard);
    expect(parsePlayerTier(null)).toBe(PlayerTier.Standard);
    expect(parsePlayerTier('vip')).toBe(PlayerTier.Standard);
  });
});
