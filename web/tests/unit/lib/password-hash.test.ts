import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPasswordHash } from '@/lib/password-hash';

describe('password-hash helpers', () => {
  it('verifies a correct password against its hash', async () => {
    const hash = await hashPassword('my-secret-password');
    await expect(verifyPasswordHash('my-secret-password', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('my-secret-password');
    await expect(verifyPasswordHash('wrong-password', hash)).resolves.toBe(false);
  });

  it('rejects null stored value', async () => {
    await expect(verifyPasswordHash('any-input', null)).resolves.toBe(false);
  });

  it('rejects empty string stored value', async () => {
    await expect(verifyPasswordHash('any-input', '')).resolves.toBe(false);
  });

  it('rejects stored value missing $ separators', async () => {
    await expect(verifyPasswordHash('any-input', 'nodollarsinhere')).resolves.toBe(false);
  });

  it('rejects stored value with wrong prefix', async () => {
    const wrongPrefix = `bcrypt$aabbccdd$${'aa'.repeat(64)}`;
    await expect(verifyPasswordHash('any-input', wrongPrefix)).resolves.toBe(false);
  });

  it('rejects stored value with non-hex salt (zero-length decoded bytes)', async () => {
    // Empty salt hex decodes to a zero-length buffer
    const zeroSalt = `scrypt$$$${'aa'.repeat(64)}`;
    await expect(verifyPasswordHash('any-input', zeroSalt)).resolves.toBe(false);
  });

  it('produces different output on two calls with the same input (random salt)', async () => {
    const hash1 = await hashPassword('same-password');
    const hash2 = await hashPassword('same-password');
    expect(hash1).not.toBe(hash2);
  });
});
