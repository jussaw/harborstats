import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GameRecapPage, { generateMetadata } from '@/app/games/[id]/page';
import { getGameRecap } from '@/lib/games';
import { PlayerTier } from '@/lib/player-tier';
import type { RatingReplay } from '@/lib/rating';
import { getRatingReplay } from '@/lib/ratings';

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/lib/games', () => ({
  getGameRecap: vi.fn(),
}));

vi.mock('@/lib/ratings', () => ({
  getRatingReplay: vi.fn(),
}));

const emptyReplay: RatingReplay = { players: [], ratedGameCount: 0 };

function ratedReplay(): RatingReplay {
  return {
    ratedGameCount: 1,
    players: [
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        rating: 1512.4,
        displayRating: 1512,
        peakRating: 1512.4,
        lastGameChange: 12.4,
        gamesPlayed: 1,
        provisional: true,
        history: [
          {
            gameId: 7,
            sequence: 0,
            playedAt: '2026-05-01T18:00:00.000Z',
            rating: 1512.4,
            change: 12.4,
            participated: true,
          },
        ],
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        rating: 1487.6,
        displayRating: 1488,
        peakRating: 1500,
        lastGameChange: -12.4,
        gamesPlayed: 1,
        provisional: true,
        history: [
          {
            gameId: 7,
            sequence: 0,
            playedAt: '2026-05-01T18:00:00.000Z',
            rating: 1487.6,
            change: -12.4,
            participated: true,
          },
        ],
      },
    ],
  };
}

describe('GameRecapPage', () => {
  beforeEach(() => {
    vi.mocked(getRatingReplay).mockResolvedValue(emptyReplay);
  });

  it('renders the outcome, scoreboard, notes, and rating impact with a back link', async () => {
    vi.mocked(getRatingReplay).mockResolvedValue(ratedReplay());
    vi.mocked(getGameRecap).mockResolvedValue({
      id: 7,
      playedAt: new Date('2026-05-01T18:00:00.000Z'),
      notes: 'Harbor decider',
      players: [
        { playerId: 1, playerName: 'Ada', score: 11, isWinner: true },
        { playerId: 2, playerName: 'Bea', score: 8, isWinner: false },
      ],
    });

    const element = await GameRecapPage({ params: Promise.resolve({ id: '7' }) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Ada wins');
    expect(markup).toContain('href="/games"');
    expect(markup).toContain('Back to games');
    expect(markup).toContain('Scoreboard');
    expect(markup).toContain('Elo shown as of this game.');
    expect(markup).toContain('href="/players/1"');
    expect(markup).toContain('href="/players/2"');
    expect(markup).toContain('1512 Elo');
    expect(markup).toContain('+12');
    expect(markup).toContain('1488 Elo');
    expect(markup).toContain('−12');
    expect(markup).toContain('(winner)');
    expect(markup).toContain('Harbor decider');
    expect(markup).not.toContain('Unrated');
  });

  it('labels participants without a replay point as unrated instead of a zero card', async () => {
    vi.mocked(getGameRecap).mockResolvedValue({
      id: 9,
      playedAt: new Date('2026-05-02T18:00:00.000Z'),
      notes: '',
      players: [{ playerId: 3, playerName: 'Cara', score: 12, isWinner: true }],
    });

    const element = await GameRecapPage({ params: Promise.resolve({ id: '9' }) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Cara wins');
    expect(markup).toContain('Unrated');
    expect(markup).not.toContain('Elo');
    expect(markup).not.toContain('Elo shown as of this game.');
    // Empty notes render no notes card.
    expect(markup).not.toContain('>Notes<');
  });

  it('renders a defensive heading when no winner is recorded', async () => {
    vi.mocked(getGameRecap).mockResolvedValue({
      id: 4,
      playedAt: new Date('2026-05-03T18:00:00.000Z'),
      notes: '',
      players: [
        { playerId: 1, playerName: 'Ada', score: 10, isWinner: false },
        { playerId: 2, playerName: 'Bea', score: 10, isWinner: false },
      ],
    });

    const element = await GameRecapPage({ params: Promise.resolve({ id: '4' }) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('No winner recorded');
  });

  it.each(['1abc', '0', '-1', '1.5', 'abc'])(
    'calls notFound for malformed game id "%s"',
    async (id) => {
      await expect(GameRecapPage({ params: Promise.resolve({ id }) })).rejects.toThrow(
        'NEXT_NOT_FOUND',
      );
    },
  );

  it('calls notFound when the game does not exist', async () => {
    vi.mocked(getGameRecap).mockResolvedValue(null);

    await expect(GameRecapPage({ params: Promise.resolve({ id: '999' }) })).rejects.toThrow(
      'NEXT_NOT_FOUND',
    );
  });
});

describe('generateMetadata', () => {
  it('titles the page after the winner', async () => {
    vi.mocked(getGameRecap).mockResolvedValue({
      id: 7,
      playedAt: new Date('2026-05-01T18:00:00.000Z'),
      notes: '',
      players: [{ playerId: 1, playerName: 'Ada', score: 11, isWinner: true }],
    });

    await expect(generateMetadata({ params: Promise.resolve({ id: '7' }) })).resolves.toEqual({
      title: 'Ada wins — HarborStats',
    });
  });

  it('falls back to a generic title when no game exists', async () => {
    vi.mocked(getGameRecap).mockResolvedValue(null);

    await expect(generateMetadata({ params: Promise.resolve({ id: '999' }) })).resolves.toEqual({
      title: 'Game — HarborStats',
    });
  });

  it.each(['1abc', '0', '-1', '1.5', 'abc'])(
    'calls notFound for malformed metadata id "%s"',
    async (id) => {
      await expect(generateMetadata({ params: Promise.resolve({ id }) })).rejects.toThrow(
        'NEXT_NOT_FOUND',
      );
    },
  );
});
