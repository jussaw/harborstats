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
