import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '@/lib/migrate';
import { openDatabase } from '@/lib/sqlite';

const FIXED_WIDTH = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{6}Z$/;

describe('sqlite schema (baseline migration)', () => {
  let dir: string;
  let s: Database.Database;

  function addPlayer(name: string, tier = 'standard'): number {
    return Number(s.prepare('INSERT INTO players (name, tier) VALUES (?, ?)').run(name, tier).lastInsertRowid);
  }

  function addGame(): number {
    return Number(
      s.prepare("INSERT INTO games (played_at) VALUES ('2026-01-01T12:00:00.000000Z')").run().lastInsertRowid,
    );
  }

  function addScore(gameId: number, playerId: number, score: number, isWinner: 0 | 1): void {
    s.prepare('INSERT INTO game_players (game_id, player_id, score, is_winner) VALUES (?, ?, ?, ?)').run(
      gameId,
      playerId,
      score,
      isWinner,
    );
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'harborstats-schema-test-'));
    s = openDatabase(join(dir, 'test.db'));
    runMigrations(s);
  });

  afterEach(() => {
    s.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts a valid game with one winner and several losers', () => {
    const gameId = addGame();
    addScore(gameId, addPlayer('Ann'), 20, 1);
    addScore(gameId, addPlayer('Bob'), 10, 0);
    addScore(gameId, addPlayer('Cy'), 10, 0);
    expect(s.prepare('SELECT count(*) AS n FROM game_players').get()).toEqual({ n: 3 });
  });

  it('rejects a score above 30', () => {
    const gameId = addGame();
    expect(() => addScore(gameId, addPlayer('Ann'), 31, 0)).toThrow(/CHECK constraint failed/);
  });

  it('rejects a negative score', () => {
    const gameId = addGame();
    expect(() => addScore(gameId, addPlayer('Ann'), -1, 0)).toThrow(/CHECK constraint failed/);
  });

  it('rejects an unknown tier', () => {
    expect(() => addPlayer('Ann', 'gold')).toThrow(/CHECK constraint failed/);
  });

  it('rejects a duplicate player name', () => {
    addPlayer('Ann');
    expect(() => addPlayer('Ann')).toThrow(/UNIQUE constraint failed: players\.name/);
  });

  it('rejects two winners in one game', () => {
    const gameId = addGame();
    addScore(gameId, addPlayer('Ann'), 20, 1);
    expect(() => addScore(gameId, addPlayer('Bob'), 20, 1)).toThrow(/UNIQUE constraint failed/);
  });

  it('rejects the same player twice in a game', () => {
    const gameId = addGame();
    const ann = addPlayer('Ann');
    addScore(gameId, ann, 20, 1);
    expect(() => addScore(gameId, ann, 10, 0)).toThrow(/UNIQUE constraint failed/);
  });

  it('rejects an unknown audit actor type', () => {
    expect(() =>
      s
        .prepare("INSERT INTO audit_logs (action, actor_type, summary) VALUES ('player.create', 'root', 'x')")
        .run(),
    ).toThrow(/CHECK constraint failed/);
  });

  it('cascades a game delete to its scores', () => {
    const gameId = addGame();
    addScore(gameId, addPlayer('Ann'), 20, 1);
    s.prepare('DELETE FROM games WHERE id = ?').run(gameId);
    expect(s.prepare('SELECT count(*) AS n FROM game_players').get()).toEqual({ n: 0 });
  });

  it('refuses to delete a player who has scores', () => {
    const gameId = addGame();
    const ann = addPlayer('Ann');
    addScore(gameId, ann, 20, 1);
    expect(() => s.prepare('DELETE FROM players WHERE id = ?').run(ann)).toThrow(
      /FOREIGN KEY constraint failed/,
    );
  });

  it('never reuses a deleted id', () => {
    addPlayer('Ann');
    const bob = addPlayer('Bob');
    s.prepare('DELETE FROM players WHERE id = ?').run(bob);
    expect(addPlayer('Cy')).toBeGreaterThan(bob);
  });

  it('defaults created_at to the fixed-width timestamp format', () => {
    const ann = addPlayer('Ann');
    const gameId = addGame();
    s.prepare("INSERT INTO audit_logs (action, actor_type, summary) VALUES ('player.create', 'admin', 'x')").run();
    s.prepare('INSERT INTO app_settings (id) VALUES (1)').run();

    const timestamps = [
      s.prepare('SELECT created_at AS t FROM players WHERE id = ?').get(ann),
      s.prepare('SELECT created_at AS t FROM games WHERE id = ?').get(gameId),
      s.prepare('SELECT created_at AS t FROM audit_logs').get(),
      s.prepare('SELECT updated_at AS t FROM app_settings').get(),
    ] as { t: string }[];
    timestamps.forEach(({ t }) => expect(t).toMatch(FIXED_WIDTH));
  });

  it('keeps the named indexes', () => {
    const names = (
      s.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'").all() as {
        name: string;
      }[]
    ).map((r) => r.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'players_name_unique',
        'idx_game_players_game',
        'idx_game_players_player',
        'game_players_game_id_player_id_unique',
        'game_players_one_winner_per_game',
        'idx_audit_logs_created_at',
        'idx_audit_logs_action',
      ]),
    );
  });
});
