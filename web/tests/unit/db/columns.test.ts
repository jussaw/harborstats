import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';
import {
  fromDbTimestamp,
  nowTimestampSql,
  timestampText,
  toDbTimestamp,
  toDbTimestampCeil,
} from '@/db/columns';

const FIXED_WIDTH = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/;

describe('toDbTimestamp', () => {
  it('writes UTC with six fractional digits', () => {
    expect(toDbTimestamp(new Date('2026-01-01T12:00:00.123Z'))).toBe('2026-01-01T12:00:00.123000Z');
  });

  it('is always 27 characters', () => {
    expect(toDbTimestamp(new Date('2026-01-01T12:00:00.000Z'))).toHaveLength(27);
  });

  it('sorts at or before an old microsecond row in the same millisecond', () => {
    // Review Focus 1: boundary compares correctly as text
    expect(toDbTimestamp(new Date('2026-11-12T04:34:59.485Z')) <= '2026-11-12T04:34:59.485225Z').toBe(
      true,
    );
  });
});

describe('toDbTimestampCeil', () => {
  it('points at the last microsecond of the millisecond', () => {
    expect(toDbTimestampCeil(new Date('2026-11-12T04:34:59.485Z'))).toBe('2026-11-12T04:34:59.485999Z');
  });

  it('sorts at or after an old microsecond row in the same millisecond', () => {
    expect(toDbTimestampCeil(new Date('2026-11-12T04:34:59.485Z')) >= '2026-11-12T04:34:59.485225Z').toBe(
      true,
    );
  });
});

describe('fromDbTimestamp', () => {
  it('reads microsecond text into a millisecond Date', () => {
    expect(fromDbTimestamp('2026-11-12T04:34:59.485225Z').toISOString()).toBe('2026-11-12T04:34:59.485Z');
  });

  it('round-trips what toDbTimestamp writes', () => {
    const date = new Date('2026-03-04T05:06:07.089Z');
    expect(fromDbTimestamp(toDbTimestamp(date)).getTime()).toBe(date.getTime());
  });
});

describe('timestampText column', () => {
  const things = sqliteTable('things', {
    id: integer('id').primaryKey(),
    at: timestampText('at').notNull(),
    createdAt: timestampText('created_at').notNull().default(nowTimestampSql),
  });

  function openThings() {
    const sqlite = new Database(':memory:');
    sqlite.exec(
      "CREATE TABLE things (id integer PRIMARY KEY, at text NOT NULL, created_at text NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now') || '000Z'))",
    );
    return { sqlite, db: drizzle(sqlite) };
  }

  it('stores a Date as fixed-width text and reads it back as a Date', () => {
    const { sqlite, db } = openThings();
    const at = new Date('2026-01-01T12:00:00.123Z');

    db.insert(things).values({ id: 1, at }).run();

    const raw = sqlite.prepare('SELECT at, created_at FROM things WHERE id = 1').get() as {
      at: string;
      created_at: string;
    };
    expect(raw.at).toBe('2026-01-01T12:00:00.123000Z');
    expect(raw.created_at).toMatch(FIXED_WIDTH);

    const [row] = db.select().from(things).where(eq(things.id, 1)).all();
    expect(row.at).toBeInstanceOf(Date);
    expect(row.at.toISOString()).toBe('2026-01-01T12:00:00.123Z');
    expect(row.createdAt).toBeInstanceOf(Date);
  });
});
