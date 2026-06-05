import { describe, expect, it } from 'vitest';
import { getClientIp } from '@/lib/request-ip';

describe('getClientIp', () => {
  it('prefers cf-connecting-ip over other headers', () => {
    const headers = new Headers({
      'cf-connecting-ip': '203.0.113.7',
      'x-forwarded-for': '198.51.100.1, 10.0.0.1',
      'x-real-ip': '198.51.100.9',
    });
    expect(getClientIp(headers)).toBe('203.0.113.7');
  });

  it('falls back to the first x-forwarded-for hop', () => {
    const headers = new Headers({
      'x-forwarded-for': '198.51.100.1, 10.0.0.1',
      'x-real-ip': '198.51.100.9',
    });
    expect(getClientIp(headers)).toBe('198.51.100.1');
  });

  it('falls back to x-real-ip when no forwarded-for is present', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.9' });
    expect(getClientIp(headers)).toBe('198.51.100.9');
  });

  it('returns null when no source header is present', () => {
    expect(getClientIp(new Headers())).toBeNull();
  });
});
