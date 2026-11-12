import { sql } from 'drizzle-orm';
import { customType } from 'drizzle-orm/sqlite-core';

// Timestamps are stored as TEXT, UTC, fixed width `YYYY-MM-DDTHH:MM:SS.ffffffZ`
// (27 chars). Fixed width keeps text comparison and ordering correct, and the
// six fractional digits keep the microseconds carried over from Postgres. JS
// Dates only hold milliseconds, so values the app writes end in `000Z`.

// `toISOString()` is 24 chars only for years 0000–9999; outside that it uses an
// expanded `±YYYYYY` year that would not fit the fixed width or read back.
const ISO_LENGTH = 24;

export function isStorableTimestamp(date: Date): boolean {
  return Number.isFinite(date.getTime()) && date.toISOString().length === ISO_LENGTH;
}

export function toDbTimestamp(date: Date): string {
  const iso = date.toISOString();
  if (iso.length !== ISO_LENGTH) {
    throw new RangeError(`Timestamp ${iso} is outside the storable years 0000–9999`);
  }
  return `${iso.slice(0, 23)}000Z`;
}

// Last microsecond of the date's millisecond. Use it for inclusive upper
// bounds: `…485000Z` sorts before an old row at `…485225Z`, `…485999Z` does not.
export function toDbTimestampCeil(date: Date): string {
  return `${toDbTimestamp(date).slice(0, 23)}999Z`;
}

export function fromDbTimestamp(value: string): Date {
  return new Date(`${value.slice(0, 23)}Z`);
}

export const timestampText = customType<{ data: Date; driverData: string }>({
  dataType() {
    return 'text';
  },
  toDriver(value) {
    return toDbTimestamp(value);
  },
  fromDriver(value) {
    return fromDbTimestamp(value);
  },
});

// DB-side default emitting the same fixed-width format (`%f` is SS.SSS).
export const nowTimestampSql = sql`(strftime('%Y-%m-%dT%H:%M:%f', 'now') || '000Z')`;
