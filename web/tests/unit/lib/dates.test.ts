import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  dateInputToEndOfDay,
  dateInputToStartOfDay,
  dateToDateInputValue,
  datetimeLocalToIso,
  isoToDatetimeLocal,
  nowDatetimeLocal,
  isStorableTimestamp,
} from '@/lib/dates';

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

  it('formats a Date as a date input value in the stable test timezone', () => {
    expect(dateToDateInputValue(new Date('2026-04-20T15:16:00.000Z'))).toBe('2026-04-20');
  });

  it('converts a date input value to the start of the local day', () => {
    expect(dateInputToStartOfDay('2026-04-20').toISOString()).toBe('2026-04-20T00:00:00.000Z');
  });

  it('converts a date input value to the end of the local day', () => {
    expect(dateInputToEndOfDay('2026-04-20').toISOString()).toBe('2026-04-20T23:59:59.999Z');
  });

  it('formats the current UTC time as a datetime-local value without seconds', () => {
    vi.setSystemTime(new Date('2026-04-20T15:16:30.000Z'));

    expect(nowDatetimeLocal()).toBe('2026-04-20T15:16');
  });
});

describe('isStorableTimestamp', () => {
  it('accepts dates in years 0000-9999', () => {
    expect(isStorableTimestamp(new Date('0000-01-01T00:00:00.000Z'))).toBe(true);
    expect(isStorableTimestamp(new Date('2026-11-12T04:34:59.485Z'))).toBe(true);
    expect(isStorableTimestamp(new Date('9999-12-31T23:59:59.999Z'))).toBe(true);
  });

  it('rejects years outside 0000-9999 and invalid dates', () => {
    expect(isStorableTimestamp(new Date('+010000-01-01T00:00:00.000Z'))).toBe(false);
    expect(isStorableTimestamp(new Date('-000001-12-31T23:59:59.999Z'))).toBe(false);
    expect(isStorableTimestamp(new Date('not-a-date'))).toBe(false);
  });
});
