import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_MIGRATIONS_FOLDER, runMigrations } from '@/lib/migrate';
import { openDatabase } from '@/lib/sqlite';

// The table-rebuild shape drizzle-kit generates for SQLite when a change can't
// be done with ALTER TABLE (a new CHECK, a NOT NULL or default change, …).
const REBUILD_GAMES_SQL = `PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE \`__new_games\` (
	\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	\`played_at\` text NOT NULL,
	\`notes\` text DEFAULT '' NOT NULL,
	\`submitted_from_ip\` text,
	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now') || '000Z') NOT NULL,
	CONSTRAINT "games_played_at_check" CHECK(length("__new_games"."played_at") = 27)
);
--> statement-breakpoint
INSERT INTO \`__new_games\`("id", "played_at", "notes", "submitted_from_ip", "created_at") SELECT "id", "played_at", "notes", "submitted_from_ip", "created_at" FROM \`games\`;--> statement-breakpoint
DROP TABLE \`games\`;--> statement-breakpoint
ALTER TABLE \`__new_games\` RENAME TO \`games\`;--> statement-breakpoint
PRAGMA foreign_keys=ON;`;

// A migration that leaves scores pointing at a player that no longer exists.
const ORPHAN_SCORES_SQL = 'DELETE FROM `players`;';

describe('runMigrations', () => {
  let dir: string;
  let s: Database.Database;

  /** Copies the real migrations and appends one extra migration after the baseline. */
  function migrationsWith(tag: string, sqlText: string): string {
    const folder = join(dir, `migrations-${tag}`);
    cpSync(DEFAULT_MIGRATIONS_FOLDER, folder, { recursive: true });
    const journalPath = join(folder, 'meta', '_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8')) as {
      entries: { idx: number; version: string; when: number; tag: string; breakpoints: boolean }[];
    };
    const last = journal.entries[journal.entries.length - 1];
    journal.entries.push({ ...last, idx: last.idx + 1, when: last.when + 1000, tag });
    writeFileSync(journalPath, JSON.stringify(journal));
    writeFileSync(join(folder, `${tag}.sql`), sqlText);
    return folder;
  }

  function seedGameWithScore(): void {
    s.prepare("INSERT INTO players (id, name, tier) VALUES (1, 'Ann', 'standard')").run();
    s.prepare("INSERT INTO games (id, played_at) VALUES (1, '2026-01-01T12:00:00.000000Z')").run();
    s.prepare(
      'INSERT INTO game_players (game_id, player_id, score, is_winner) VALUES (1, 1, 10, 1)',
    ).run();
  }

  function countRows(table: string): number {
    return (s.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'harborstats-migrate-test-'));
    s = openDatabase(join(dir, 'test.db'));
    runMigrations(s);
  });

  afterEach(() => {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('keeps scores when a later migration rebuilds the games table', () => {
    seedGameWithScore();

    runMigrations(s, migrationsWith('0001_rebuild_games', REBUILD_GAMES_SQL));

    expect(countRows('games')).toBe(1);
    expect(countRows('game_players')).toBe(1);
  });

  it('turns foreign keys back on after migrating', () => {
    runMigrations(s, migrationsWith('0001_rebuild_games', REBUILD_GAMES_SQL));
    expect(s.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('fails when a migration leaves foreign key violations, and turns foreign keys back on', () => {
    seedGameWithScore();

    expect(() => runMigrations(s, migrationsWith('0001_orphan_scores', ORPHAN_SCORES_SQL))).toThrow(
      /foreign key/i,
    );
    expect(s.pragma('foreign_keys', { simple: true })).toBe(1);
  });
});
