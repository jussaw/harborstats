import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { datetimeLocalToIso, isoToDatetimeLocal, nowDatetimeLocal } from '@/lib/dates';

describe('date helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('converts a datetime-local value to a UTC ISO string in the stable test timezone', () => {
    expect(datetimeLocalToIso('2026-04-20T15:16')).toBe('2026-04-20T15:16:00.000Z');
  });

  it('converts a UTC ISO string back to a datetime-local value in the stable test timezone', () => {
    expect(isoToDatetimeLocal('2026-04-20T15:16:00.000Z')).toBe('2026-04-20T15:16');
  });

  it('formats the current UTC time as a datetime-local value without seconds', () => {
    vi.setSystemTime(new Date('2026-04-20T15:16:30.000Z'));

    expect(nowDatetimeLocal()).toBe('2026-04-20T15:16');
  });
});
