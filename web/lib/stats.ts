import { count, desc, eq, sql } from 'drizzle-orm';
import { gamePlayers, games, players } from '@/db/schema';
import { parsePlayerTier, PlayerTier, type PlayerTier as PlayerTierType } from '@/lib/player-tier';
import { db } from './db';

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function getMedian(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getIsoWeekStart(date: Date): Date {
  const start = startOfUtcDay(date);
  const day = start.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  start.setUTCDate(start.getUTCDate() - offset);
  return start;
}

function getUtcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function formatShortUtcDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  });
}

function formatShortUtcMonth(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    year: 'numeric',
  });
}

function formatLongUtcDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface PlayerIdentity {
  playerId: number;
  name: string;
  tier: PlayerTierType;
}

interface PlayerGameSizeAccumulator extends PlayerIdentity {
  playerCount: number;
  games: number;
  wins: number;
  expectedWins: number;
}

interface PlayerExpectedWinsAccumulator extends PlayerIdentity {
  games: number;
  wins: number;
  expectedWins: number;
}

interface TierShowdownAccumulator {
  tier: PlayerTierType;
  players: number;
  appearances: number;
  wins: number;
}

interface GameSizeAggregateData {
  playerWinRateByGameSize: PlayerWinRateByGameSize[];
  playerExpectedVsActualWins: PlayerExpectedVsActualWins[];
  tierShowdownStats: TierShowdownStats[];
}

async function getGameSizeAggregateData(): Promise<GameSizeAggregateData> {
  const [playerRows, participantRows] = await Promise.all([
    db
      .select({
        playerId: players.id,
        name: players.name,
        tier: players.tier,
      })
      .from(players)
      .orderBy(sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`, players.name),
    db
      .select({
        gameId: gamePlayers.gameId,
        playerId: gamePlayers.playerId,
        isWinner: gamePlayers.isWinner,
      })
      .from(gamePlayers),
  ]);

  const playersById = new Map<number, PlayerIdentity>(
    playerRows.map((player) => [
      player.playerId,
      {
        playerId: player.playerId,
        name: player.name,
        tier: parsePlayerTier(player.tier),
      },
    ]),
  );

  const expectedWinsByPlayerId = new Map<number, PlayerExpectedWinsAccumulator>(
    playerRows.map((player) => [
      player.playerId,
      {
        playerId: player.playerId,
        name: player.name,
        tier: parsePlayerTier(player.tier),
        games: 0,
        wins: 0,
        expectedWins: 0,
      },
    ]),
  );

  const tierStats: Record<PlayerTier, TierShowdownAccumulator> = {
    [PlayerTier.Premium]: {
      tier: PlayerTier.Premium,
      players: playerRows.filter((player) => parsePlayerTier(player.tier) === PlayerTier.Premium)
        .length,
      appearances: 0,
      wins: 0,
    },
    [PlayerTier.Standard]: {
      tier: PlayerTier.Standard,
      players: playerRows.filter((player) => parsePlayerTier(player.tier) === PlayerTier.Standard)
        .length,
      appearances: 0,
      wins: 0,
    },
  };

  const gameSizeBuckets = new Map<string, PlayerGameSizeAccumulator>();
  const participantsByGameId = new Map<number, typeof participantRows>();

  participantRows.forEach((participant) => {
    const existing = participantsByGameId.get(participant.gameId) ?? [];
    existing.push(participant);
    participantsByGameId.set(participant.gameId, existing);
  });

  participantsByGameId.forEach((participants) => {
    const playerCount = participants.length;
    if (playerCount === 0) {
      return;
    }

    const expectedWinShare = 1 / playerCount;

    participants.forEach((participant) => {
      const player = playersById.get(participant.playerId);
      const expectedWins = expectedWinsByPlayerId.get(participant.playerId);
      if (!player || !expectedWins) {
        return;
      }

      expectedWins.games += 1;
      expectedWins.wins += participant.isWinner ? 1 : 0;
      expectedWins.expectedWins += expectedWinShare;

      const tier = tierStats[player.tier];
      if (tier) {
        tier.appearances += 1;
        tier.wins += participant.isWinner ? 1 : 0;
      }

      const key = `${participant.playerId}:${playerCount}`;
      const bucket = gameSizeBuckets.get(key) ?? {
        ...player,
        playerCount,
        games: 0,
        wins: 0,
        expectedWins: 0,
      };

      bucket.games += 1;
      bucket.wins += participant.isWinner ? 1 : 0;
      bucket.expectedWins += expectedWinShare;

      gameSizeBuckets.set(key, bucket);
    });
  });

  return {
    playerWinRateByGameSize: [...gameSizeBuckets.values()]
      .map((bucket) => ({
        playerId: bucket.playerId,
        name: bucket.name,
        tier: bucket.tier,
        playerCount: bucket.playerCount,
        games: bucket.games,
        wins: bucket.wins,
        winRate: bucket.games > 0 ? bucket.wins / bucket.games : 0,
      }))
      .sort(
        (a, b) => a.playerId - b.playerId || a.playerCount - b.playerCount || b.winRate - a.winRate,
      ),
    playerExpectedVsActualWins: [...expectedWinsByPlayerId.values()]
      .map((player) => ({
        playerId: player.playerId,
        name: player.name,
        tier: player.tier,
        games: player.games,
        wins: player.wins,
        expectedWins: round1(player.expectedWins),
        winDelta: round1(player.wins - player.expectedWins),
      }))
      .sort(
        (a, b) =>
          b.winDelta - a.winDelta ||
          b.wins - a.wins ||
          b.expectedWins - a.expectedWins ||
          a.name.localeCompare(b.name),
      ),
    tierShowdownStats: Object.values(tierStats)
      .map((tier) => ({
        tier: tier.tier,
        players: tier.players,
        appearances: tier.appearances,
        wins: tier.wins,
        winRate: tier.appearances > 0 ? tier.wins / tier.appearances : 0,
      }))
      .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins || a.tier.localeCompare(b.tier)),
  };
}

export interface PlayerWinRate {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  games: number;
  wins: number;
  winRate: number; // 0.0–1.0
}

export async function getPlayerWinRates(): Promise<PlayerWinRate[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      games: count(gamePlayers.id),
      wins: sql<number>`cast(count(*) filter (where ${gamePlayers.isWinner} = true) as integer)`,
    })
    .from(players)
    .leftJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
    .groupBy(players.id);

  return rows
    .map((row) => ({
      ...row,
      tier: parsePlayerTier(row.tier),
      winRate: row.games > 0 ? row.wins / row.games : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate);
}

interface PlayerScoreRow extends PlayerIdentity {
  score: number;
}

function comparePlayersByTierAndName(a: PlayerIdentity, b: PlayerIdentity) {
  if (a.tier !== b.tier) {
    return a.tier === PlayerTier.Premium ? -1 : 1;
  }

  return a.name.localeCompare(b.name) || a.playerId - b.playerId;
}

function getInterpolatedPercentile(values: number[], percentile: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * percentile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  }

  const lowerValue = sorted[lowerIndex];
  const upperValue = sorted[upperIndex];
  const weight = index - lowerIndex;

  return lowerValue + (upperValue - lowerValue) * weight;
}

async function getPlayerScoreRows(): Promise<PlayerScoreRow[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      score: gamePlayers.score,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(
      sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`,
      players.name,
      gamePlayers.score,
    );

  return rows.map((row) => ({
    playerId: row.playerId,
    name: row.name,
    tier: parsePlayerTier(row.tier),
    score: row.score,
  }));
}

export interface PlayerScoreStats {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  games: number;
  avgScore: number;
  medianScore: number;
}

export async function getPlayerScoreStats(): Promise<PlayerScoreStats[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      games: count(gamePlayers.id),
      avgScore: sql<number>`AVG(${gamePlayers.score})`,
      medianScore: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${gamePlayers.score})`,
    })
    .from(players)
    .innerJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
    .groupBy(players.id);

  return rows
    .map((row) => ({
      ...row,
      tier: parsePlayerTier(row.tier),
      avgScore: round1(row.avgScore),
      medianScore: round1(row.medianScore),
    }))
    .sort((a, b) => b.avgScore - a.avgScore);
}

export interface ScoreHistogramBucket {
  score: number;
  count: number;
}

export async function getScoreHistogramBuckets(): Promise<ScoreHistogramBucket[]> {
  const rows = await getPlayerScoreRows();
  const bucketCounts = new Map<number, number>();

  rows.forEach((row) => {
    bucketCounts.set(row.score, (bucketCounts.get(row.score) ?? 0) + 1);
  });

  return [...bucketCounts.entries()]
    .map(([score, bucketCount]) => ({
      score,
      count: bucketCount,
    }))
    .sort((a, b) => a.score - b.score);
}

export interface PlayerScoreDistribution {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  count: number;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export async function getPerPlayerScoreDistributions(): Promise<PlayerScoreDistribution[]> {
  const rows = await getPlayerScoreRows();
  const scoresByPlayerId = new Map<number, PlayerIdentity & { scores: number[] }>();

  rows.forEach((row) => {
    const existing = scoresByPlayerId.get(row.playerId) ?? {
      playerId: row.playerId,
      name: row.name,
      tier: row.tier,
      scores: [],
    };

    existing.scores.push(row.score);
    scoresByPlayerId.set(row.playerId, existing);
  });

  return [...scoresByPlayerId.values()]
    .map((player) => {
      const sortedScores = [...player.scores].sort((a, b) => a - b);

      return {
        playerId: player.playerId,
        name: player.name,
        tier: player.tier,
        count: sortedScores.length,
        min: sortedScores[0],
        q1: round1(getInterpolatedPercentile(sortedScores, 0.25)),
        median: round1(getInterpolatedPercentile(sortedScores, 0.5)),
        q3: round1(getInterpolatedPercentile(sortedScores, 0.75)),
        max: sortedScores[sortedScores.length - 1],
      };
    })
    .sort(comparePlayersByTierAndName);
}

export interface PlayerCumulativeScoreStats {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  games: number;
  totalScore: number;
  pointsPerGame: number;
}

export async function getPlayerCumulativeScoreStats(): Promise<PlayerCumulativeScoreStats[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      games: count(gamePlayers.id),
      totalScore: sql<number>`COALESCE(SUM(${gamePlayers.score}), 0)`,
    })
    .from(players)
    .leftJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
    .groupBy(players.id);

  return rows
    .map((row) => ({
      playerId: row.playerId,
      name: row.name,
      tier: parsePlayerTier(row.tier),
      games: row.games,
      totalScore: Number(row.totalScore),
      pointsPerGame: row.games > 0 ? round1(Number(row.totalScore) / row.games) : 0,
    }))
    .sort(
      (a, b) => b.totalScore - a.totalScore || b.games - a.games || a.name.localeCompare(b.name),
    );
}

interface PlayerNormalizedScoreAccumulator extends PlayerIdentity {
  normalizedScores: number[];
}

interface GameScoreParticipantRow {
  gameId: number;
  score: number;
  isWinner: boolean;
}

interface WinningScoreSummary {
  gameId: number;
  playerCount: number;
  winningScore: number;
  winnerRowScores: number[];
  nonWinnerRowScores: number[];
}

async function getWinningScoreSummaries(): Promise<WinningScoreSummary[]> {
  const rows = await db
    .select({
      gameId: gamePlayers.gameId,
      score: gamePlayers.score,
      isWinner: gamePlayers.isWinner,
    })
    .from(gamePlayers)
    .orderBy(gamePlayers.gameId, desc(gamePlayers.score), desc(gamePlayers.isWinner));

  const participantsByGameId = new Map<number, GameScoreParticipantRow[]>();

  rows.forEach((row) => {
    const existing = participantsByGameId.get(row.gameId) ?? [];
    existing.push(row);
    participantsByGameId.set(row.gameId, existing);
  });

  return [...participantsByGameId.values()].map((participants) => {
    const explicitWinners = participants.filter((participant) => participant.isWinner);
    const winningScore =
      explicitWinners.length > 0
        ? Math.max(...explicitWinners.map((participant) => participant.score))
        : Math.max(...participants.map((participant) => participant.score));
    const winnerRows =
      explicitWinners.length > 0
        ? explicitWinners
        : participants.filter((participant) => participant.score === winningScore);
    const winnerRowSet = new Set(winnerRows);

    return {
      gameId: participants[0].gameId,
      playerCount: participants.length,
      winningScore,
      winnerRowScores: winnerRows.map((participant) => participant.score),
      nonWinnerRowScores: participants
        .filter((participant) => !winnerRowSet.has(participant))
        .map((participant) => participant.score),
    };
  });
}

export interface PlayerNormalizedScoreStats {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  games: number;
  avgScore: number;
  medianScore: number;
}

export async function getPlayerNormalizedScoreStats(): Promise<PlayerNormalizedScoreStats[]> {
  const rows = await db
    .select({
      gameId: gamePlayers.gameId,
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      score: gamePlayers.score,
      isWinner: gamePlayers.isWinner,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(gamePlayers.gameId, players.id);

  const participantsByGameId = new Map<number, typeof rows>();

  rows.forEach((row) => {
    const existing = participantsByGameId.get(row.gameId) ?? [];
    existing.push(row);
    participantsByGameId.set(row.gameId, existing);
  });

  const normalizedScoresByPlayerId = new Map<number, PlayerNormalizedScoreAccumulator>();

  participantsByGameId.forEach((participants) => {
    const winnerScores = participants
      .filter((participant) => participant.isWinner)
      .map((participant) => participant.score);
    const winningScore =
      winnerScores.length > 0
        ? Math.max(...winnerScores)
        : Math.max(...participants.map((participant) => participant.score));

    if (winningScore <= 0) {
      return;
    }

    participants.forEach((participant) => {
      const existing = normalizedScoresByPlayerId.get(participant.playerId) ?? {
        playerId: participant.playerId,
        name: participant.name,
        tier: parsePlayerTier(participant.tier),
        normalizedScores: [],
      };

      existing.normalizedScores.push(participant.score / winningScore);
      normalizedScoresByPlayerId.set(participant.playerId, existing);
    });
  });

  return [...normalizedScoresByPlayerId.values()]
    .map((player) => ({
      playerId: player.playerId,
      name: player.name,
      tier: player.tier,
      games: player.normalizedScores.length,
      avgScore: round3(
        player.normalizedScores.reduce((sum, score) => sum + score, 0) /
          player.normalizedScores.length,
      ),
      medianScore: round3(getMedian(player.normalizedScores)),
    }))
    .sort(
      (a, b) =>
        b.avgScore - a.avgScore || b.medianScore - a.medianScore || a.name.localeCompare(b.name),
    );
}

export interface WinningScoreComparison {
  winnerRows: number;
  nonWinnerRows: number;
  avgWinningScore: number;
  avgLosingScore: number;
  scoreGap: number;
}

export async function getWinningScoreComparison(): Promise<WinningScoreComparison> {
  const summaries = await getWinningScoreSummaries();
  const winnerScores = summaries.flatMap((summary) => summary.winnerRowScores);
  const nonWinnerScores = summaries.flatMap((summary) => summary.nonWinnerRowScores);
  const avgWinningScore =
    winnerScores.length > 0
      ? round1(winnerScores.reduce((sum, score) => sum + score, 0) / winnerScores.length)
      : 0;
  const avgLosingScore =
    nonWinnerScores.length > 0
      ? round1(nonWinnerScores.reduce((sum, score) => sum + score, 0) / nonWinnerScores.length)
      : 0;

  return {
    winnerRows: winnerScores.length,
    nonWinnerRows: nonWinnerScores.length,
    avgWinningScore,
    avgLosingScore,
    scoreGap: round1(avgWinningScore - avgLosingScore),
  };
}

export interface WinningScoreByGameSizeBucket {
  playerCount: number;
  gameCount: number;
  avgWinningScore: number;
}

export async function getWinningScoreByGameSize(): Promise<WinningScoreByGameSizeBucket[]> {
  const summaries = await getWinningScoreSummaries();
  const buckets = new Map<number, { gameCount: number; winningScoreTotal: number }>();

  summaries.forEach((summary) => {
    const existing = buckets.get(summary.playerCount) ?? {
      gameCount: 0,
      winningScoreTotal: 0,
    };

    existing.gameCount += 1;
    existing.winningScoreTotal += summary.winningScore;
    buckets.set(summary.playerCount, existing);
  });

  return [...buckets.entries()]
    .map(([playerCount, bucket]) => ({
      playerCount,
      gameCount: bucket.gameCount,
      avgWinningScore: round1(bucket.winningScoreTotal / bucket.gameCount),
    }))
    .sort((a, b) => a.playerCount - b.playerCount);
}

export interface PlayerPodiumRate {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  games: number;
  podiums: number;
  podiumRate: number; // 0.0–1.0
}

export async function getPlayerPodiumRates(): Promise<PlayerPodiumRate[]> {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        gp.player_id,
        RANK() OVER (PARTITION BY gp.game_id ORDER BY gp.score DESC) AS finish_rank
      FROM game_players gp
    )
    SELECT
      p.id          AS "playerId",
      p.name,
      p.tier,
      COUNT(r.player_id)::integer           AS games,
      SUM(CASE WHEN r.finish_rank <= 2 THEN 1 ELSE 0 END)::integer AS podiums
    FROM players p
    LEFT JOIN ranked r ON r.player_id = p.id
    GROUP BY p.id, p.name, p.tier
    ORDER BY podiums DESC
  `);

  return (result as Record<string, unknown>[])
    .map((row) => {
      const gameCount = row.games as number;
      const podiums = row.podiums as number;
      return {
        playerId: row.playerId as number,
        name: row.name as string,
        tier: parsePlayerTier(row.tier as string),
        games: gameCount,
        podiums,
        podiumRate: gameCount > 0 ? podiums / gameCount : 0,
      };
    })
    .sort((a, b) => b.podiumRate - a.podiumRate || b.podiums - a.podiums);
}

export interface PlayerFinishBreakdown {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  games: number;
  firsts: number;
  seconds: number;
  thirds: number;
  lasts: number;
  firstRate: number;
  secondRate: number;
  thirdRate: number;
  lastRate: number;
}

export async function getPlayerFinishBreakdowns(): Promise<PlayerFinishBreakdown[]> {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        gp.player_id,
        gp.game_id,
        gp.score,
        RANK() OVER (PARTITION BY gp.game_id ORDER BY gp.score DESC) AS finish_rank,
        MIN(gp.score) OVER (PARTITION BY gp.game_id)                 AS lowest_score
      FROM game_players gp
    )
    SELECT
      p.id AS "playerId",
      p.name,
      p.tier,
      COUNT(r.game_id)::integer                                    AS games,
      SUM(CASE WHEN r.finish_rank = 1 THEN 1 ELSE 0 END)::integer  AS firsts,
      SUM(CASE WHEN r.finish_rank = 2 THEN 1 ELSE 0 END)::integer  AS seconds,
      SUM(CASE WHEN r.finish_rank = 3 THEN 1 ELSE 0 END)::integer  AS thirds,
      SUM(CASE WHEN r.score = r.lowest_score THEN 1 ELSE 0 END)::integer AS lasts
    FROM players p
    LEFT JOIN ranked r ON r.player_id = p.id
    GROUP BY p.id, p.name, p.tier
  `);

  return (result as Record<string, unknown>[])
    .map((row) => {
      const gameCount = row.games as number;
      const firsts = row.firsts as number;
      const seconds = row.seconds as number;
      const thirds = row.thirds as number;
      const lasts = row.lasts as number;

      return {
        playerId: row.playerId as number,
        name: row.name as string,
        tier: parsePlayerTier(row.tier as string),
        games: gameCount,
        firsts,
        seconds,
        thirds,
        lasts,
        firstRate: gameCount > 0 ? firsts / gameCount : 0,
        secondRate: gameCount > 0 ? seconds / gameCount : 0,
        thirdRate: gameCount > 0 ? thirds / gameCount : 0,
        lastRate: gameCount > 0 ? lasts / gameCount : 0,
      };
    })
    .sort(
      (a, b) =>
        b.firstRate - a.firstRate ||
        b.firsts - a.firsts ||
        b.secondRate - a.secondRate ||
        b.thirdRate - a.thirdRate ||
        a.lastRate - b.lastRate ||
        b.games - a.games ||
        a.name.localeCompare(b.name),
    );
}

export interface PlayerMarginStats {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  winGames: number;
  lossGames: number;
  averageVictoryMargin: number | null;
  averageDefeatMargin: number | null;
}

interface PlayerMarginAccumulator {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  winGames: number;
  lossGames: number;
  victoryMarginTotal: number;
  defeatMarginTotal: number;
}

export async function getPlayerMarginStats(): Promise<PlayerMarginStats[]> {
  const [playerRows, participantRows] = await Promise.all([
    db
      .select({
        playerId: players.id,
        name: players.name,
        tier: players.tier,
      })
      .from(players)
      .orderBy(sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`, players.name),
    db
      .select({
        gameId: gamePlayers.gameId,
        playerId: gamePlayers.playerId,
        score: gamePlayers.score,
        isWinner: gamePlayers.isWinner,
      })
      .from(gamePlayers),
  ]);

  const statsByPlayerId = new Map<number, PlayerMarginAccumulator>(
    playerRows.map((player) => [
      player.playerId,
      {
        playerId: player.playerId,
        name: player.name,
        tier: parsePlayerTier(player.tier),
        winGames: 0,
        lossGames: 0,
        victoryMarginTotal: 0,
        defeatMarginTotal: 0,
      },
    ]),
  );

  const participantsByGameId = new Map<number, typeof participantRows>();

  participantRows.forEach((row) => {
    const existing = participantsByGameId.get(row.gameId) ?? [];
    existing.push(row);
    participantsByGameId.set(row.gameId, existing);
  });

  participantsByGameId.forEach((participants) => {
    const winners = participants.filter((participant) => participant.isWinner);
    if (winners.length === 0) {
      return;
    }

    const losers = participants.filter((participant) => !participant.isWinner);
    const bestNonWinnerScore =
      losers.length > 0 ? Math.max(...losers.map((participant) => participant.score)) : null;
    const bestRecordedWinnerScore = Math.max(...winners.map((participant) => participant.score));

    winners.forEach((winner) => {
      const stats = statsByPlayerId.get(winner.playerId);
      if (!stats) return;

      stats.winGames += 1;
      stats.victoryMarginTotal +=
        bestNonWinnerScore === null ? 0 : winner.score - bestNonWinnerScore;
    });

    losers.forEach((loser) => {
      const stats = statsByPlayerId.get(loser.playerId);
      if (!stats) return;

      stats.lossGames += 1;
      stats.defeatMarginTotal += bestRecordedWinnerScore - loser.score;
    });
  });

  return [...statsByPlayerId.values()].map((player) => ({
    playerId: player.playerId,
    name: player.name,
    tier: player.tier,
    winGames: player.winGames,
    lossGames: player.lossGames,
    averageVictoryMargin:
      player.winGames > 0 ? round1(player.victoryMarginTotal / player.winGames) : null,
    averageDefeatMargin:
      player.lossGames > 0 ? round1(player.defeatMarginTotal / player.lossGames) : null,
  }));
}

export interface HighestScoreRecord extends PlayerIdentity {
  gameId: number;
  playedAt: string;
  score: number;
}

export type WinningScoreRecord = HighestScoreRecord;

export interface MarginGameRecord {
  gameId: number;
  playedAt: string;
  winner: string;
  winnerScore: number;
  runnerUpScore: number;
  margin: number;
  participantCount: number;
}

export interface SingleGameRecords {
  highestScore: HighestScoreRecord | null;
  lowestWinningScore: WinningScoreRecord | null;
  biggestBlowout: MarginGameRecord | null;
  closestGame: MarginGameRecord | null;
}

interface SingleGameParticipantRecord extends PlayerIdentity {
  gameId: number;
  playedAt: Date;
  score: number;
  isWinner: boolean;
}

interface InternalScoreRecord extends PlayerIdentity {
  gameId: number;
  playedAt: Date;
  score: number;
}

interface InternalMarginGameRecord {
  gameId: number;
  playedAt: Date;
  winner: string;
  winnerScore: number;
  runnerUpScore: number;
  margin: number;
  participantCount: number;
}

function prefersNewerGame(
  candidate: { gameId: number; playedAt: Date },
  current: { gameId: number; playedAt: Date },
): boolean {
  const playedAtDiff = candidate.playedAt.getTime() - current.playedAt.getTime();

  if (playedAtDiff !== 0) {
    return playedAtDiff > 0;
  }

  return candidate.gameId > current.gameId;
}

function prefersHighestScore(
  candidate: InternalScoreRecord,
  current: InternalScoreRecord,
): boolean {
  if (candidate.score !== current.score) {
    return candidate.score > current.score;
  }

  if (prefersNewerGame(candidate, current)) {
    return true;
  }

  if (
    candidate.playedAt.getTime() === current.playedAt.getTime() &&
    candidate.gameId === current.gameId
  ) {
    return candidate.name.localeCompare(current.name) < 0;
  }

  return false;
}

function prefersLowestWinningScore(
  candidate: InternalScoreRecord,
  current: InternalScoreRecord,
): boolean {
  if (candidate.score !== current.score) {
    return candidate.score < current.score;
  }

  if (prefersNewerGame(candidate, current)) {
    return true;
  }

  if (
    candidate.playedAt.getTime() === current.playedAt.getTime() &&
    candidate.gameId === current.gameId
  ) {
    return candidate.name.localeCompare(current.name) < 0;
  }

  return false;
}

function prefersMarginRecord(
  candidate: InternalMarginGameRecord,
  current: InternalMarginGameRecord,
  direction: 'highest' | 'lowest',
): boolean {
  if (candidate.margin !== current.margin) {
    return direction === 'highest'
      ? candidate.margin > current.margin
      : candidate.margin < current.margin;
  }

  return prefersNewerGame(candidate, current);
}

function toScoreRecord(record: InternalScoreRecord): HighestScoreRecord {
  return {
    gameId: record.gameId,
    playedAt: record.playedAt.toISOString(),
    playerId: record.playerId,
    name: record.name,
    tier: record.tier,
    score: record.score,
  };
}

function toMarginRecord(record: InternalMarginGameRecord): MarginGameRecord {
  return {
    gameId: record.gameId,
    playedAt: record.playedAt.toISOString(),
    winner: record.winner,
    winnerScore: record.winnerScore,
    runnerUpScore: record.runnerUpScore,
    margin: record.margin,
    participantCount: record.participantCount,
  };
}

export async function getSingleGameRecords(): Promise<SingleGameRecords> {
  const rows = await db
    .select({
      gameId: games.id,
      playedAt: games.playedAt,
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      score: gamePlayers.score,
      isWinner: gamePlayers.isWinner,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(desc(games.playedAt), desc(games.id), desc(gamePlayers.score), players.name);

  let highestScore: InternalScoreRecord | null = null;
  let lowestWinningScore: InternalScoreRecord | null = null;
  let biggestBlowout: InternalMarginGameRecord | null = null;
  let closestGame: InternalMarginGameRecord | null = null;
  const participantsByGameId = new Map<number, SingleGameParticipantRecord[]>();

  rows.forEach((row) => {
    const record: SingleGameParticipantRecord = {
      gameId: row.gameId,
      playedAt: row.playedAt,
      playerId: row.playerId,
      name: row.name,
      tier: parsePlayerTier(row.tier),
      score: row.score,
      isWinner: row.isWinner,
    };
    const scoreRecord: InternalScoreRecord = {
      gameId: record.gameId,
      playedAt: record.playedAt,
      playerId: record.playerId,
      name: record.name,
      tier: record.tier,
      score: record.score,
    };

    if (highestScore === null || prefersHighestScore(scoreRecord, highestScore)) {
      highestScore = scoreRecord;
    }

    if (
      record.isWinner &&
      (lowestWinningScore === null || prefersLowestWinningScore(scoreRecord, lowestWinningScore))
    ) {
      lowestWinningScore = scoreRecord;
    }

    const existing = participantsByGameId.get(record.gameId) ?? [];
    existing.push(record);
    participantsByGameId.set(record.gameId, existing);
  });

  participantsByGameId.forEach((participants) => {
    const winners = participants.filter((participant) => participant.isWinner);
    const nonWinners = participants.filter((participant) => !participant.isWinner);

    if (winners.length === 0 || nonWinners.length === 0) {
      return;
    }

    const winnerScore = Math.max(...winners.map((winner) => winner.score));
    const topWinners = winners
      .filter((winner) => winner.score === winnerScore)
      .sort((a, b) => a.name.localeCompare(b.name));
    const runnerUpScore = Math.max(...nonWinners.map((participant) => participant.score));
    if (winnerScore < runnerUpScore) {
      return;
    }

    const marginRecord: InternalMarginGameRecord = {
      gameId: participants[0].gameId,
      playedAt: participants[0].playedAt,
      winner: topWinners.map((winner) => winner.name).join(', '),
      winnerScore,
      runnerUpScore,
      margin: winnerScore - runnerUpScore,
      participantCount: participants.length,
    };

    if (biggestBlowout === null || prefersMarginRecord(marginRecord, biggestBlowout, 'highest')) {
      biggestBlowout = marginRecord;
    }

    if (closestGame === null || prefersMarginRecord(marginRecord, closestGame, 'lowest')) {
      closestGame = marginRecord;
    }
  });

  return {
    highestScore: highestScore ? toScoreRecord(highestScore) : null,
    lowestWinningScore: lowestWinningScore ? toScoreRecord(lowestWinningScore) : null,
    biggestBlowout: biggestBlowout ? toMarginRecord(biggestBlowout) : null,
    closestGame: closestGame ? toMarginRecord(closestGame) : null,
  };
}

export interface PlayerWinRateByGameSize {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  playerCount: number;
  games: number;
  wins: number;
  winRate: number;
}

export async function getPlayerWinRateByGameSize(): Promise<PlayerWinRateByGameSize[]> {
  const data = await getGameSizeAggregateData();
  return data.playerWinRateByGameSize;
}

export interface TierShowdownStats {
  tier: PlayerTierType;
  players: number;
  appearances: number;
  wins: number;
  winRate: number;
}

export async function getTierShowdownStats(): Promise<TierShowdownStats[]> {
  const data = await getGameSizeAggregateData();
  return data.tierShowdownStats;
}

export interface PlayerExpectedVsActualWins {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  games: number;
  wins: number;
  expectedWins: number;
  winDelta: number;
}

export async function getPlayerExpectedVsActualWins(): Promise<PlayerExpectedVsActualWins[]> {
  const data = await getGameSizeAggregateData();
  return data.playerExpectedVsActualWins;
}

export interface RecentActivitySummary {
  totalGames: number;
  latestPlayedAt: string | null;
}

export async function getRecentActivitySummary(): Promise<RecentActivitySummary> {
  const [latestGame] = await db
    .select({
      playedAt: games.playedAt,
    })
    .from(games)
    .orderBy(desc(games.playedAt), desc(games.id))
    .limit(1);

  const [{ totalGames }] = await db
    .select({
      totalGames: count(),
    })
    .from(games);

  if (!latestGame) {
    return {
      totalGames,
      latestPlayedAt: null,
    };
  }

  return {
    totalGames,
    latestPlayedAt: latestGame.playedAt.toISOString(),
  };
}

interface GameOutcomeRow {
  gameId: number;
  playedAt: Date;
  playerId: number;
  name: string;
  tier: PlayerTierType;
  isWinner: boolean;
}

interface OrderedGameOutcomeData {
  players: PlayerIdentity[];
  outcomeRows: GameOutcomeRow[];
}

async function getOrderedGameOutcomeData(): Promise<OrderedGameOutcomeData> {
  const [playerRows, outcomeRows] = await Promise.all([
    db
      .select({
        playerId: players.id,
        name: players.name,
        tier: players.tier,
      })
      .from(players)
      .orderBy(players.name),
    db
      .select({
        gameId: games.id,
        playedAt: games.playedAt,
        playerId: players.id,
        name: players.name,
        tier: players.tier,
        isWinner: gamePlayers.isWinner,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .innerJoin(players, eq(players.id, gamePlayers.playerId))
      .orderBy(desc(games.playedAt), desc(games.id), players.name),
  ]);

  return {
    players: playerRows.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      tier: parsePlayerTier(player.tier),
    })),
    outcomeRows: outcomeRows.map((row) => ({
      gameId: row.gameId,
      playedAt: row.playedAt,
      playerId: row.playerId,
      name: row.name,
      tier: parsePlayerTier(row.tier),
      isWinner: row.isWinner,
    })),
  };
}

export interface ReigningChampionSummary {
  playedAt: string;
  winners: PlayerIdentity[];
}

export async function getReigningChampionSummary(): Promise<ReigningChampionSummary | null> {
  const { outcomeRows } = await getOrderedGameOutcomeData();
  const latestGame = outcomeRows[0];

  if (!latestGame) {
    return null;
  }

  return {
    playedAt: latestGame.playedAt.toISOString(),
    winners: outcomeRows
      .filter((row) => row.gameId === latestGame.gameId && row.isWinner)
      .map((row) => ({
        playerId: row.playerId,
        name: row.name,
        tier: row.tier,
      })),
  };
}

export interface PlayerCurrentWinStreak extends PlayerIdentity {
  streak: number;
  mostRecentAppearance: string | null;
  mostRecentWin: string | null;
}

interface StreakAccumulator {
  count: number;
  startedAt: Date | null;
  endedAt: Date | null;
}

interface PlayerStreakAccumulator {
  longestWin: StreakAccumulator;
  currentLoss: StreakAccumulator;
  longestLoss: StreakAccumulator;
  attendance: StreakAccumulator;
}

export interface PlayerStreakRecord extends PlayerIdentity {
  longestWinStreak: number;
  longestWinStreakStartedAt: string | null;
  longestWinStreakEndedAt: string | null;
  currentLossStreak: number;
  currentLossStreakStartedAt: string | null;
  currentLossStreakEndedAt: string | null;
  longestLossStreak: number;
  longestLossStreakStartedAt: string | null;
  longestLossStreakEndedAt: string | null;
  attendanceStreak: number;
  attendanceStreakStartedAt: string | null;
  attendanceStreakEndedAt: string | null;
}

function compareNullableIsoDesc(left: string | null, right: string | null) {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right.localeCompare(left);
}

export async function getPlayerCurrentWinStreaks(): Promise<PlayerCurrentWinStreak[]> {
  const { players: allPlayers, outcomeRows } = await getOrderedGameOutcomeData();
  const rowsByPlayerId = new Map<number, GameOutcomeRow[]>();
  const mostRecentAppearanceByPlayerId = new Map<number, string | null>(
    allPlayers.map((player) => [player.playerId, null]),
  );
  const mostRecentWinByPlayerId = new Map<number, string | null>(
    allPlayers.map((player) => [player.playerId, null]),
  );

  outcomeRows.forEach((row) => {
    const existingRows = rowsByPlayerId.get(row.playerId) ?? [];
    existingRows.push(row);
    rowsByPlayerId.set(row.playerId, existingRows);

    if (mostRecentAppearanceByPlayerId.get(row.playerId) === null) {
      mostRecentAppearanceByPlayerId.set(row.playerId, row.playedAt.toISOString());
    }

    if (row.isWinner && mostRecentWinByPlayerId.get(row.playerId) === null) {
      mostRecentWinByPlayerId.set(row.playerId, row.playedAt.toISOString());
    }
  });

  return allPlayers
    .map((player) => {
      const rows = rowsByPlayerId.get(player.playerId) ?? [];
      let streak = 0;

      rows.some((row) => {
        if (!row.isWinner) {
          return true;
        }

        streak += 1;
        return false;
      });

      return {
        ...player,
        streak,
        mostRecentAppearance: mostRecentAppearanceByPlayerId.get(player.playerId) ?? null,
        mostRecentWin: mostRecentWinByPlayerId.get(player.playerId) ?? null,
      };
    })
    .sort(
      (a, b) =>
        b.streak - a.streak ||
        compareNullableIsoDesc(a.mostRecentWin, b.mostRecentWin) ||
        a.name.localeCompare(b.name),
    );
}

function createEmptyStreak(): StreakAccumulator {
  return {
    count: 0,
    startedAt: null,
    endedAt: null,
  };
}

function shouldReplaceStreak(candidate: StreakAccumulator, best: StreakAccumulator) {
  if (candidate.count === 0 || !candidate.startedAt || !candidate.endedAt) {
    return false;
  }

  if (candidate.count !== best.count) {
    return candidate.count > best.count;
  }

  if (!best.endedAt) {
    return true;
  }

  return candidate.endedAt.getTime() >= best.endedAt.getTime();
}

function cloneStreak(streak: StreakAccumulator): StreakAccumulator {
  return {
    count: streak.count,
    startedAt: streak.startedAt,
    endedAt: streak.endedAt,
  };
}

function serializeDate(date: Date | null) {
  return date?.toISOString() ?? null;
}

function sortOutcomeRowsChronologically(left: GameOutcomeRow, right: GameOutcomeRow) {
  return (
    left.playedAt.getTime() - right.playedAt.getTime() ||
    left.gameId - right.gameId ||
    left.name.localeCompare(right.name)
  );
}

async function getOrderedGameRows(): Promise<{ gameId: number; playedAt: Date }[]> {
  return db
    .select({
      gameId: games.id,
      playedAt: games.playedAt,
    })
    .from(games)
    .orderBy(games.playedAt, games.id);
}

export async function getPlayerStreakRecords(): Promise<PlayerStreakRecord[]> {
  const [{ players: allPlayers, outcomeRows }, gameRows] = await Promise.all([
    getOrderedGameOutcomeData(),
    getOrderedGameRows(),
  ]);
  const outcomeRowsByPlayerId = new Map<number, GameOutcomeRow[]>();
  const playerIdsByGameId = new Map<number, Set<number>>();

  outcomeRows.forEach((row) => {
    const playerOutcomeRows = outcomeRowsByPlayerId.get(row.playerId) ?? [];
    playerOutcomeRows.push(row);
    outcomeRowsByPlayerId.set(row.playerId, playerOutcomeRows);

    const gamePlayerIds = playerIdsByGameId.get(row.gameId) ?? new Set<number>();
    gamePlayerIds.add(row.playerId);
    playerIdsByGameId.set(row.gameId, gamePlayerIds);
  });

  return allPlayers.map((player) => {
    const accumulator: PlayerStreakAccumulator = {
      longestWin: createEmptyStreak(),
      currentLoss: createEmptyStreak(),
      longestLoss: createEmptyStreak(),
      attendance: createEmptyStreak(),
    };
    let activeWin = createEmptyStreak();
    let activeLoss = createEmptyStreak();
    let activeAttendance = createEmptyStreak();
    const rows = [...(outcomeRowsByPlayerId.get(player.playerId) ?? [])].sort(
      sortOutcomeRowsChronologically,
    );

    rows.forEach((row) => {
      if (row.isWinner) {
        activeWin = {
          count: activeWin.count + 1,
          startedAt: activeWin.startedAt ?? row.playedAt,
          endedAt: row.playedAt,
        };
        activeLoss = createEmptyStreak();

        if (shouldReplaceStreak(activeWin, accumulator.longestWin)) {
          accumulator.longestWin = cloneStreak(activeWin);
        }
      } else {
        activeLoss = {
          count: activeLoss.count + 1,
          startedAt: activeLoss.startedAt ?? row.playedAt,
          endedAt: row.playedAt,
        };
        activeWin = createEmptyStreak();

        if (shouldReplaceStreak(activeLoss, accumulator.longestLoss)) {
          accumulator.longestLoss = cloneStreak(activeLoss);
        }
      }
    });

    accumulator.currentLoss = cloneStreak(activeLoss);

    gameRows.forEach((game) => {
      if (playerIdsByGameId.get(game.gameId)?.has(player.playerId)) {
        activeAttendance = {
          count: activeAttendance.count + 1,
          startedAt: activeAttendance.startedAt ?? game.playedAt,
          endedAt: game.playedAt,
        };

        if (shouldReplaceStreak(activeAttendance, accumulator.attendance)) {
          accumulator.attendance = cloneStreak(activeAttendance);
        }
      } else {
        activeAttendance = createEmptyStreak();
      }
    });

    return {
      ...player,
      longestWinStreak: accumulator.longestWin.count,
      longestWinStreakStartedAt: serializeDate(accumulator.longestWin.startedAt),
      longestWinStreakEndedAt: serializeDate(accumulator.longestWin.endedAt),
      currentLossStreak: accumulator.currentLoss.count,
      currentLossStreakStartedAt: serializeDate(accumulator.currentLoss.startedAt),
      currentLossStreakEndedAt: serializeDate(accumulator.currentLoss.endedAt),
      longestLossStreak: accumulator.longestLoss.count,
      longestLossStreakStartedAt: serializeDate(accumulator.longestLoss.startedAt),
      longestLossStreakEndedAt: serializeDate(accumulator.longestLoss.endedAt),
      attendanceStreak: accumulator.attendance.count,
      attendanceStreakStartedAt: serializeDate(accumulator.attendance.startedAt),
      attendanceStreakEndedAt: serializeDate(accumulator.attendance.endedAt),
    };
  });
}

export interface PlayerWinEvent extends PlayerIdentity {
  playedAt: string;
}

export async function getPlayerWinEvents(): Promise<PlayerWinEvent[]> {
  const { outcomeRows } = await getOrderedGameOutcomeData();

  return outcomeRows
    .filter((row) => row.isWinner)
    .map((row) => ({
      playedAt: row.playedAt.toISOString(),
      playerId: row.playerId,
      name: row.name,
      tier: row.tier,
    }));
}

async function getOrderedGameDates(): Promise<Date[]> {
  const gameRows = await db
    .select({
      playedAt: games.playedAt,
    })
    .from(games)
    .orderBy(games.playedAt, games.id);

  return gameRows.map((game) => game.playedAt);
}

export async function getGameActivityTimestamps(): Promise<string[]> {
  const playedAtDates = await getOrderedGameDates();
  return playedAtDates.map((playedAt) => playedAt.toISOString());
}

export interface ActivityBucket {
  bucketStart: Date;
  label: string;
  gameCount: number;
}

export interface GamesOverTimeSeries {
  weekly: ActivityBucket[];
  monthly: ActivityBucket[];
  totalGames: number;
}

function buildBucketStarts(
  playedAtDates: Date[],
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
): Date[] {
  if (playedAtDates.length === 0) {
    return [];
  }

  const firstBucket = getBucketStart(playedAtDates[0]);
  const lastBucket = getBucketStart(playedAtDates[playedAtDates.length - 1]);
  const bucketStarts: Date[] = [];

  for (
    let bucketStart = firstBucket;
    bucketStart.getTime() <= lastBucket.getTime();
    bucketStart = getNextBucketStart(bucketStart)
  ) {
    bucketStarts.push(bucketStart);
  }

  return bucketStarts;
}

function buildActivityBuckets(
  playedAtDates: Date[],
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
  formatLabel: (date: Date) => string,
): ActivityBucket[] {
  if (playedAtDates.length === 0) {
    return [];
  }

  const countsByBucket = new Map<string, number>();

  playedAtDates.forEach((playedAt) => {
    const bucketStart = getBucketStart(playedAt);
    const bucketKey = toUtcDateKey(bucketStart);
    countsByBucket.set(bucketKey, (countsByBucket.get(bucketKey) ?? 0) + 1);
  });

  return buildBucketStarts(playedAtDates, getBucketStart, getNextBucketStart).map((bucketStart) => {
    const bucketKey = toUtcDateKey(bucketStart);

    return {
      bucketStart,
      label: formatLabel(bucketStart),
      gameCount: countsByBucket.get(bucketKey) ?? 0,
    };
  });
}

export async function getGamesOverTimeSeries(): Promise<GamesOverTimeSeries> {
  const playedAtDates = await getOrderedGameDates();

  return {
    weekly: buildActivityBuckets(
      playedAtDates,
      getIsoWeekStart,
      (date) => addUtcDays(date, 7),
      formatShortUtcDate,
    ),
    monthly: buildActivityBuckets(
      playedAtDates,
      getUtcMonthStart,
      (date) => addUtcMonths(date, 1),
      formatShortUtcMonth,
    ),
    totalGames: playedAtDates.length,
  };
}

interface PlayerActivityRow {
  playedAt: Date;
  playerId: number;
  name: string;
  tier: PlayerTierType;
}

export interface PlayerAttendanceSegment {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  gameCount: number;
}

export interface PlayerAttendanceBucket {
  bucketStart: Date;
  label: string;
  totalAppearances: number;
  segments: PlayerAttendanceSegment[];
}

export interface PlayerAttendanceSeries {
  weekly: PlayerAttendanceBucket[];
  monthly: PlayerAttendanceBucket[];
}

export interface PlayerAttendanceEvent {
  playedAt: string;
  playerId: number;
  name: string;
  tier: PlayerTierType;
}

function buildPlayerAttendanceBuckets(
  rows: PlayerActivityRow[],
  playedAtDates: Date[],
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
  formatLabel: (date: Date) => string,
): PlayerAttendanceBucket[] {
  if (rows.length === 0) {
    return [];
  }

  const segmentsByBucket = new Map<string, Map<number, PlayerAttendanceSegment>>();

  rows.forEach((row) => {
    const bucketStart = getBucketStart(row.playedAt);
    const bucketKey = toUtcDateKey(bucketStart);
    const bucketSegments =
      segmentsByBucket.get(bucketKey) ?? new Map<number, PlayerAttendanceSegment>();
    const existing = bucketSegments.get(row.playerId) ?? {
      playerId: row.playerId,
      name: row.name,
      tier: row.tier,
      gameCount: 0,
    };

    existing.gameCount += 1;
    bucketSegments.set(row.playerId, existing);
    segmentsByBucket.set(bucketKey, bucketSegments);
  });

  return buildBucketStarts(playedAtDates, getBucketStart, getNextBucketStart).map((bucketStart) => {
    const bucketKey = toUtcDateKey(bucketStart);
    const segments = [...(segmentsByBucket.get(bucketKey)?.values() ?? [])].sort(
      (a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name),
    );

    return {
      bucketStart,
      label: formatLabel(bucketStart),
      totalAppearances: segments.reduce((total, segment) => total + segment.gameCount, 0),
      segments,
    };
  });
}

export async function getPlayerAttendanceSeries(): Promise<PlayerAttendanceSeries> {
  const rows = await db
    .select({
      playedAt: games.playedAt,
      playerId: players.id,
      name: players.name,
      tier: players.tier,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(games.playedAt, games.id, players.name);

  const attendanceRows = rows.map((row) => ({
    playedAt: row.playedAt,
    playerId: row.playerId,
    name: row.name,
    tier: parsePlayerTier(row.tier),
  }));
  const playedAtDates = attendanceRows.map((row) => row.playedAt);

  return {
    weekly: buildPlayerAttendanceBuckets(
      attendanceRows,
      playedAtDates,
      getIsoWeekStart,
      (date) => addUtcDays(date, 7),
      formatShortUtcDate,
    ),
    monthly: buildPlayerAttendanceBuckets(
      attendanceRows,
      playedAtDates,
      getUtcMonthStart,
      (date) => addUtcMonths(date, 1),
      formatShortUtcMonth,
    ),
  };
}

export async function getPlayerAttendanceEvents(): Promise<PlayerAttendanceEvent[]> {
  const rows = await db
    .select({
      playedAt: games.playedAt,
      playerId: players.id,
      name: players.name,
      tier: players.tier,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(games.playedAt, games.id, players.name);

  return rows.map((row) => ({
    playedAt: row.playedAt.toISOString(),
    playerId: row.playerId,
    name: row.name,
    tier: parsePlayerTier(row.tier),
  }));
}

export interface CalendarHeatmapDay {
  date: Date;
  label: string;
  gameCount: number;
}

export interface CalendarHeatmapYear {
  year: number;
  days: CalendarHeatmapDay[];
  totalGames: number;
}

export interface CalendarHeatmapData {
  recentDays: CalendarHeatmapDay[];
  recentRangeLabel: string | null;
  years: CalendarHeatmapYear[];
  defaultYear: number | null;
}

function buildUtcDateRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];

  for (
    let current = startOfUtcDay(start);
    current.getTime() <= startOfUtcDay(end).getTime();
    current = addUtcDays(current, 1)
  ) {
    days.push(current);
  }

  return days;
}

function buildCalendarHeatmapDays(
  start: Date,
  end: Date,
  countsByDay: Map<string, number>,
): CalendarHeatmapDay[] {
  return buildUtcDateRange(start, end).map((date) => {
    const dateKey = toUtcDateKey(date);

    return {
      date,
      label: formatLongUtcDate(date),
      gameCount: countsByDay.get(dateKey) ?? 0,
    };
  });
}

export async function getCalendarHeatmapData(): Promise<CalendarHeatmapData> {
  const playedAtDates = await getOrderedGameDates();

  if (playedAtDates.length === 0) {
    return {
      recentDays: [],
      recentRangeLabel: null,
      years: [],
      defaultYear: null,
    };
  }

  const countsByDay = new Map<string, number>();

  playedAtDates.forEach((playedAt) => {
    const day = startOfUtcDay(playedAt);
    const dayKey = toUtcDateKey(day);
    countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1);
  });

  const latestDay = startOfUtcDay(playedAtDates[playedAtDates.length - 1]);
  const recentStart = addUtcDays(
    new Date(
      Date.UTC(latestDay.getUTCFullYear() - 1, latestDay.getUTCMonth(), latestDay.getUTCDate()),
    ),
    1,
  );
  const firstRecordedYear = playedAtDates[0].getUTCFullYear();
  const lastRecordedYear = latestDay.getUTCFullYear();
  const years: CalendarHeatmapYear[] = [];

  for (let year = lastRecordedYear; year >= firstRecordedYear; year -= 1) {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));
    const days = buildCalendarHeatmapDays(start, end, countsByDay);
    const totalGames = days.reduce((total, day) => total + day.gameCount, 0);

    if (totalGames > 0) {
      years.push({
        year,
        days,
        totalGames,
      });
    }
  }

  return {
    recentDays: buildCalendarHeatmapDays(recentStart, latestDay, countsByDay),
    recentRangeLabel: `${formatLongUtcDate(recentStart)} - ${formatLongUtcDate(latestDay)}`,
    years,
    defaultYear: lastRecordedYear,
  };
}

export interface PlayerParticipationRate {
  playerId: number;
  name: string;
  tier: PlayerTierType;
  gamesPlayed: number;
  totalGames: number;
  participationRate: number;
}

export async function getPlayerParticipationRates(): Promise<PlayerParticipationRate[]> {
  const [rows, [{ totalGames }]] = await Promise.all([
    db
      .select({
        playerId: players.id,
        name: players.name,
        tier: players.tier,
        gamesPlayed: count(gamePlayers.id),
      })
      .from(players)
      .leftJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
      .groupBy(players.id)
      .orderBy(players.name),
    db
      .select({
        totalGames: count(),
      })
      .from(games),
  ]);

  return rows
    .map((row) => ({
      playerId: row.playerId,
      name: row.name,
      tier: parsePlayerTier(row.tier),
      gamesPlayed: row.gamesPlayed,
      totalGames,
      participationRate: totalGames > 0 ? row.gamesPlayed / totalGames : 0,
    }))
    .sort((a, b) => b.participationRate - a.participationRate || a.name.localeCompare(b.name));
}
