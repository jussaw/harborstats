import { relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertIsTestDatabase, getTestDatabasePath } from '@/tests/helpers/test-env';

describe('assertIsTestDatabase', () => {
  it('accepts the test database file', () => {
    expect(() => assertIsTestDatabase(getTestDatabasePath())).not.toThrow();
  });

  it('accepts the test database file given as a relative path', () => {
    expect(() =>
      assertIsTestDatabase(relative(process.cwd(), getTestDatabasePath())),
    ).not.toThrow();
  });

  it('refuses any other database file', () => {
    expect(() => assertIsTestDatabase('./data/harborstats.db')).toThrow(/not the test database/);
  });
});
