import { describe, expect, it } from 'vitest';
import { getClientIp, normalizeForRateLimit } from '@/lib/request-ip';

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

  it('accepts a literal IPv6 cf-connecting-ip', () => {
    const headers = new Headers({ 'cf-connecting-ip': '2001:db8::1' });
    expect(getClientIp(headers)).toBe('2001:db8::1');
  });

  it('accepts a literal IPv6 first x-forwarded-for hop', () => {
    const headers = new Headers({ 'x-forwarded-for': '2001:db8::2, 10.0.0.1' });
    expect(getClientIp(headers)).toBe('2001:db8::2');
  });

  it('returns null for a malformed cf-connecting-ip without falling through', () => {
    const headers = new Headers({
      'cf-connecting-ip': 'not-an-ip',
      'x-forwarded-for': '198.51.100.1',
      'x-real-ip': '198.51.100.9',
    });
    expect(getClientIp(headers)).toBeNull();
  });

  it('returns null for a cf-connecting-ip carrying a port', () => {
    const headers = new Headers({ 'cf-connecting-ip': '203.0.113.7:443' });
    expect(getClientIp(headers)).toBeNull();
  });

  it('returns null for a malformed first x-forwarded-for hop without falling through', () => {
    const headers = new Headers({
      'x-forwarded-for': 'unknown, 198.51.100.1',
      'x-real-ip': '198.51.100.9',
    });
    expect(getClientIp(headers)).toBeNull();
  });

  it('returns null for an x-forwarded-for hop carrying a port', () => {
    const headers = new Headers({ 'x-forwarded-for': '198.51.100.1:8080, 10.0.0.1' });
    expect(getClientIp(headers)).toBeNull();
  });

  it('returns null for a malformed x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': 'unknown' });
    expect(getClientIp(headers)).toBeNull();
  });

  it('returns null for an x-real-ip carrying a port', () => {
    const headers = new Headers({ 'x-real-ip': '198.51.100.9:9000' });
    expect(getClientIp(headers)).toBeNull();
  });
});

describe('normalizeForRateLimit', () => {
  it('returns an IPv4 address unchanged', () => {
    expect(normalizeForRateLimit('198.51.100.1')).toBe('198.51.100.1');
  });

  it('collapses a compressed IPv6 address to its /64 prefix', () => {
    expect(normalizeForRateLimit('2001:db8::1')).toBe('2001:db8:0:0::/64');
  });

  it('collapses a fully expanded IPv6 address to its /64 prefix', () => {
    expect(normalizeForRateLimit('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe(
      '2001:db8:85a3:0::/64',
    );
  });

  it('maps two addresses in the same /64 to the same key', () => {
    const a = normalizeForRateLimit('2001:db8::1');
    const b = normalizeForRateLimit('2001:db8:0:0:ffff:ffff:ffff:ffff');
    expect(a).toBe(b);
  });

  it('maps addresses in different /64s to different keys', () => {
    const a = normalizeForRateLimit('2001:db8:1::1');
    const b = normalizeForRateLimit('2001:db8:2::1');
    expect(a).not.toBe(b);
    expect(a).toBe('2001:db8:1:0::/64');
    expect(b).toBe('2001:db8:2:0::/64');
  });

  it('handles the compressed loopback address', () => {
    expect(normalizeForRateLimit('::1')).toBe('0:0:0:0::/64');
  });

  it('returns a non-IP input unchanged', () => {
    expect(normalizeForRateLimit('unknown')).toBe('unknown');
  });

  it('unwraps an IPv4-mapped IPv6 address to the embedded IPv4', () => {
    expect(normalizeForRateLimit('::ffff:192.0.2.1')).toBe('192.0.2.1');
  });

  it('maps two distinct IPv4-mapped addresses to different keys', () => {
    const a = normalizeForRateLimit('::ffff:192.0.2.1');
    const b = normalizeForRateLimit('::ffff:198.51.100.9');
    expect(a).not.toBe(b);
    expect(a).toBe('192.0.2.1');
    expect(b).toBe('198.51.100.9');
  });
});
