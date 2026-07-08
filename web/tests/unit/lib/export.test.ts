import { describe, expect, it } from 'vitest';
import { gamesToCsv } from '@/lib/export';
import type { RecentGame } from '@/lib/games';

const HEADER = 'game_id,played_at,notes,player,score,is_winner';

function buildGame(overrides: Partial<RecentGame> = {}): RecentGame {
  return {
    id: 1,
    playedAt: new Date('2026-01-02T12:00:00.000Z'),
    notes: '',
    players: [
      { playerName: 'Alice', score: 12, isWinner: true },
      { playerName: 'Bob', score: 8, isWinner: false },
    ],
    ...overrides,
  };
}

describe('gamesToCsv', () => {
  it('returns only the header for an empty export', () => {
    expect(gamesToCsv([])).toBe(`${HEADER}\r\n`);
  });

  it('writes one row per player appearance in long format', () => {
    const csv = gamesToCsv([buildGame()]);

    expect(csv).toBe(
      `${HEADER}\r\n` +
        '1,2026-01-02T12:00:00.000Z,,Alice,12,true\r\n' +
        '1,2026-01-02T12:00:00.000Z,,Bob,8,false\r\n',
    );
  });

  it('quotes and escapes notes containing commas, quotes, and newlines', () => {
    const csv = gamesToCsv([
      buildGame({
        notes: 'Robber on 8, "brutal" night\nrematch demanded',
        players: [{ playerName: 'Alice', score: 10, isWinner: true }],
      }),
    ]);

    expect(csv).toContain('"Robber on 8, ""brutal"" night\nrematch demanded"');
  });

  it('quotes player names containing commas', () => {
    const csv = gamesToCsv([
      buildGame({
        players: [{ playerName: 'Smith, Jr.', score: 9, isWinner: true }],
      }),
    ]);

    expect(csv).toContain(',"Smith, Jr.",9,true');
  });

  it('neutralizes formula injection in notes by prefixing a single quote', () => {
    const csv = gamesToCsv([
      buildGame({
        notes: '=HYPERLINK("http://evil.example","click")',
        players: [{ playerName: 'Alice', score: 10, isWinner: true }],
      }),
    ]);

    // Leads with '=', so the cell is prefixed with ' and then RFC-4180 quoted
    // because it contains commas and quotes.
    expect(csv).toContain('"\'=HYPERLINK(""http://evil.example"",""click"")"');
  });

  it('neutralizes formula-triggering player names (=, +, -, @)', () => {
    ['=', '+', '-', '@'].forEach((trigger) => {
      const csv = gamesToCsv([
        buildGame({
          players: [{ playerName: `${trigger}cmd`, score: 7, isWinner: true }],
        }),
      ]);

      expect(csv).toContain(`,'${trigger}cmd,7,true`);
    });
  });

  it('leaves ordinary values untouched', () => {
    const csv = gamesToCsv([
      buildGame({
        notes: 'good clean game',
        players: [{ playerName: 'Alice', score: 10, isWinner: true }],
      }),
    ]);

    expect(csv).toContain(',good clean game,Alice,10,true');
  });
});
