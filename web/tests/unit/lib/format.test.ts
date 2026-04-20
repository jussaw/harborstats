import { describe, expect, it } from 'vitest';

import { formatAverage, formatPercent } from '@/lib/format';

describe('format helpers', () => {
  it('formats percentages with the default and explicit precision', () => {
    expect(formatPercent(0.127)).toBe('13%');
    expect(formatPercent(0.125, 1)).toBe('12.5%');
  });

  it('formats averages with the default and explicit precision', () => {
    expect(formatAverage(12.34)).toBe('12.3');
    expect(formatAverage(12.345, 2)).toBe('12.35');
  });
});
