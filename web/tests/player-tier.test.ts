import test from 'node:test';
import assert from 'node:assert/strict';

import { PlayerTier, parsePlayerTier } from '../lib/player-tier';

test('parsePlayerTier returns premium for premium input', () => {
  assert.equal(parsePlayerTier('premium'), PlayerTier.Premium);
});

test('parsePlayerTier returns standard for standard input', () => {
  assert.equal(parsePlayerTier('standard'), PlayerTier.Standard);
});

test('parsePlayerTier falls back to standard for missing or invalid input', () => {
  assert.equal(parsePlayerTier(undefined), PlayerTier.Standard);
  assert.equal(parsePlayerTier(null), PlayerTier.Standard);
  assert.equal(parsePlayerTier('vip'), PlayerTier.Standard);
});
