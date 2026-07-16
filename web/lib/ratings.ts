import { asc, eq } from 'drizzle-orm';
import { gamePlayers, games, players } from '@/db/schema';
import { parsePlayerTier } from '@/lib/player-tier';
import { replayRatings, type RatingReplay } from '@/lib/rating';
import { db } from './db';
import { gameIdCondition, playerIdCondition, type StatsFilter } from './stats-filter';

/** Replays the current stats cohort from recorded game history; ratings are never persisted. */
export async function getRatingReplay(filter: StatsFilter = null): Promise<RatingReplay> {
  const [playerRows, participantRows] = await Promise.all([
    db
      .select({ playerId: players.id, name: players.name, tier: players.tier })
      .from(players)
      .where(playerIdCondition(filter, players.id))
      .orderBy(asc(players.id)),
    db
      .select({
        gameId: games.id,
        playedAt: games.playedAt,
        playerId: gamePlayers.playerId,
        score: gamePlayers.score,
        isWinner: gamePlayers.isWinner,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(gamePlayers.gameId, games.id))
      .where(gameIdCondition(filter, games.id))
      .orderBy(asc(games.playedAt), asc(games.id), asc(gamePlayers.playerId)),
  ]);

  const participantsByGame = new Map<
    number,
    { playedAt: string; participants: { playerId: number; score: number; isWinner: boolean }[] }
  >();
  participantRows.forEach((row) => {
    const game = participantsByGame.get(row.gameId) ?? {
      playedAt: row.playedAt.toISOString(),
      participants: [],
    };
    game.participants.push({
      playerId: row.playerId,
      score: row.score,
      isWinner: row.isWinner,
    });
    participantsByGame.set(row.gameId, game);
  });

  return replayRatings({
    players: playerRows.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      tier: parsePlayerTier(player.tier),
    })),
    games: [...participantsByGame.entries()].map(([gameId, game]) => ({
      gameId,
      playedAt: game.playedAt,
      participants: game.participants,
    })),
  });
}
