import {
  computeClutchFactor,
  computeConsistencyRatings,
  computeCurrentWinStreaks,
  computeDominanceIndex,
  computeGameSizeAggregateData,
  computeHeadToHeadRecords,
  computeNailBiterRecords,
  computePerPlayerScoreDistributions,
  computeRivalryAggregates,
  computeScoreHistogramBuckets,
  computeStreakRecords,
  computeWinEvents,
  computeWinningScoreByGameSize,
  computeWinningScoreComparison,
  computeKingmakers,
  fetchPlayerAndParticipantRows,
  getGameActivityTimestamps,
  getGameParticipantRows,
  getOrderedGameOutcomeData,
  getOrderedGameRows,
  getPlayerAttendanceEvents,
  getPlayerCumulativeScoreStats,
  getPlayerFinishBreakdowns,
  getPlayerNormalizedScoreStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreRows,
  getPlayerScoreStats,
  getPlayerWinRates,
  getSingleGameRecords,
  getWinningScoreSummaries,
  type PlayerAttendanceEvent,
  type PlayerClutchFactor,
  type PlayerConsistencyRating,
  type PlayerCumulativeScoreStats,
  type PlayerCurrentWinStreak,
  type PlayerDominanceIndex,
  type PlayerExpectedVsActualWins,
  type PlayerFinishBreakdown,
  type PlayerHeadToHeadRecord,
  type PlayerKingmaker,
  type PlayerNailBiterRecord,
  type PlayerNormalizedScoreStats,
  type PlayerParticipationRate,
  type PlayerPodiumRate,
  type PlayerScoreDistribution,
  type PlayerScoreStats,
  type PlayerStreakRecord,
  type PlayerWinEvent,
  type PlayerWinRate,
  type RivalryAggregate,
  type ScoreHistogramBucket,
  type SingleGameRecords,
  type TierShowdownStats,
  type WinningScoreByGameSizeBucket,
  type WinningScoreComparison,
} from '@/lib/stats';
import type { StatsFilter } from '@/lib/stats-filter';

/**
 * Request-local bundle of every game/participant-sourced stat the `/stats` page renders. A single
 * orchestration call fetches each shared source row set once and derives all dependent cards from
 * it, so the page performs far fewer source queries than awaiting every public getter in a fan-out.
 *
 * Rating replay and settings are intentionally left out: they draw from independent sources and
 * are fetched alongside this bundle by the page.
 */
export interface StatsPageData {
  winRates: PlayerWinRate[];
  scoreStats: PlayerScoreStats[];
  scoreHistogramBuckets: ScoreHistogramBucket[];
  perPlayerScoreDistributions: PlayerScoreDistribution[];
  cumulativeScoreStats: PlayerCumulativeScoreStats[];
  normalizedScoreStats: PlayerNormalizedScoreStats[];
  podiumRates: PlayerPodiumRate[];
  finishBreakdowns: PlayerFinishBreakdown[];
  tierShowdown: TierShowdownStats[];
  expectedVsActualWins: PlayerExpectedVsActualWins[];
  gameActivityTimestamps: string[];
  participationRates: PlayerParticipationRate[];
  playerAttendanceEvents: PlayerAttendanceEvent[];
  currentWinStreaks: PlayerCurrentWinStreak[];
  playerWinEvents: PlayerWinEvent[];
  playerStreakRecords: PlayerStreakRecord[];
  singleGameRecords: SingleGameRecords;
  winningScoreComparison: WinningScoreComparison;
  winningScoreByGameSize: WinningScoreByGameSizeBucket[];
  headToHeadRecords: PlayerHeadToHeadRecord[];
  rivalryAggregates: RivalryAggregate[];
  consistencyRatings: PlayerConsistencyRating[];
  dominanceIndex: PlayerDominanceIndex[];
  nailBiterRecords: PlayerNailBiterRecord[];
  clutchFactors: PlayerClutchFactor[];
  kingmakers: PlayerKingmaker[];
}

/**
 * Loads every `/stats` card in one request, fetching each shared source row set exactly once and
 * feeding the pure compute paths that back several cards. Cards whose source is not shared with any
 * other card keep their own single query. No cross-request or module-level caching is used — the
 * deduplication is purely within this single call.
 */
export async function getStatsPageData(filter: StatsFilter = null): Promise<StatsPageData> {
  const [
    // Shared source: tier/name-ordered roster + raw participant rows -> game-size aggregate cards
    // (tier showdown, expected-vs-actual, win-rate-by-size -> clutch) and head-to-head/rivalry.
    playerAndParticipantRows,
    // Shared source: game participant rows with identity -> consistency, dominance, nail-biter.
    gameParticipantRows,
    // Shared source: ordered game outcomes -> current streaks, win events, streak records, kingmaker.
    orderedGameOutcomeData,
    // Shared source: ordered game rows -> streak records (attendance streak).
    orderedGameRows,
    // Shared source: winning-score summaries -> winning-vs-losing comparison and by-game-size.
    winningScoreSummaries,
    // Shared source: per-appearance score rows -> score histogram and per-player distributions.
    playerScoreRows,
    // Cards whose source is unique to them keep their own query.
    winRates,
    scoreStats,
    cumulativeScoreStats,
    normalizedScoreStats,
    podiumRates,
    finishBreakdowns,
    gameActivityTimestamps,
    participationRates,
    playerAttendanceEvents,
    singleGameRecords,
  ] = await Promise.all([
    fetchPlayerAndParticipantRows(filter),
    getGameParticipantRows(filter),
    getOrderedGameOutcomeData(filter),
    getOrderedGameRows(filter),
    getWinningScoreSummaries(filter),
    getPlayerScoreRows(filter),
    getPlayerWinRates(filter),
    getPlayerScoreStats(filter),
    getPlayerCumulativeScoreStats(filter),
    getPlayerNormalizedScoreStats(filter),
    getPlayerPodiumRates(filter),
    getPlayerFinishBreakdowns(filter),
    getGameActivityTimestamps(filter),
    getPlayerParticipationRates(filter),
    getPlayerAttendanceEvents(filter),
    getSingleGameRecords(filter),
  ]);

  const gameSizeAggregate = computeGameSizeAggregateData(
    playerAndParticipantRows.playerRows,
    playerAndParticipantRows.participantRows,
  );
  const headToHeadRecords = computeHeadToHeadRecords(
    playerAndParticipantRows.playerRows,
    playerAndParticipantRows.participantRows,
  );
  const { players: outcomePlayers, outcomeRows } = orderedGameOutcomeData;

  return {
    winRates,
    scoreStats,
    scoreHistogramBuckets: computeScoreHistogramBuckets(playerScoreRows),
    perPlayerScoreDistributions: computePerPlayerScoreDistributions(playerScoreRows),
    cumulativeScoreStats,
    normalizedScoreStats,
    podiumRates,
    finishBreakdowns,
    tierShowdown: gameSizeAggregate.tierShowdownStats,
    expectedVsActualWins: gameSizeAggregate.playerExpectedVsActualWins,
    gameActivityTimestamps,
    participationRates,
    playerAttendanceEvents,
    currentWinStreaks: computeCurrentWinStreaks(outcomePlayers, outcomeRows),
    playerWinEvents: computeWinEvents(outcomeRows),
    playerStreakRecords: computeStreakRecords(outcomePlayers, outcomeRows, orderedGameRows),
    singleGameRecords,
    winningScoreComparison: computeWinningScoreComparison(winningScoreSummaries),
    winningScoreByGameSize: computeWinningScoreByGameSize(winningScoreSummaries),
    headToHeadRecords,
    rivalryAggregates: computeRivalryAggregates(headToHeadRecords),
    consistencyRatings: computeConsistencyRatings(gameParticipantRows),
    dominanceIndex: computeDominanceIndex(gameParticipantRows),
    nailBiterRecords: computeNailBiterRecords(gameParticipantRows),
    clutchFactors: computeClutchFactor(gameSizeAggregate.playerWinRateByGameSize),
    kingmakers: computeKingmakers(outcomeRows),
  };
}
