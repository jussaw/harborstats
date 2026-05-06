import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)

const FORMAT_PREFIX = 'scrypt'
const SALT_BYTES = 16
const KEY_LEN = 64
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 }

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const hash = (await scryptAsync(plain, salt, KEY_LEN, SCRYPT_PARAMS)) as Buffer
  return `${FORMAT_PREFIX}$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPasswordHash(plain: string, stored: string | null): Promise<boolean> {
  if (!stored) return false
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== FORMAT_PREFIX) return false

  const [, saltHex, hashHex] = parts
  const salt = Buffer.from(saltHex, 'hex')
  if (salt.length === 0) return false

  try {
    const expected = Buffer.from(hashHex, 'hex')
    const actual = (await scryptAsync(plain, salt, KEY_LEN, SCRYPT_PARAMS)) as Buffer
    if (actual.length !== expected.length) return false
    return timingSafeEqual(actual, expected)
  } catch {
    return false
  }
}
