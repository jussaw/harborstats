import { Fragment, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { ActivityDistributionChart } from '@/components/ActivityDistributionChart';
import { AverageGamesPerSessionCard } from '@/components/AverageGamesPerSessionCard';
import { BestWinRecordsLeaderboard } from '@/components/BestWinRecordsLeaderboard';
import { BusiestRecordsCard } from '@/components/BusiestRecordsCard';
import { CalendarHeatmap } from '@/components/CalendarHeatmap';
import { CumulativeGamesAreaChart } from '@/components/CumulativeGamesAreaChart';
import { RatingHistoryChart } from '@/components/RatingHistoryChart';
import { FormattedDate } from '@/components/FormattedDate';
import { GamesOverTimeChart } from '@/components/GamesOverTimeChart';
import { HeadToHeadMatrix } from '@/components/HeadToHeadMatrix';
import { RivalryCard } from '@/components/RivalryCard';
import { LongestGapCard } from '@/components/LongestGapCard';
import { PlayerAttendanceChart } from '@/components/PlayerAttendanceChart';
import { PlayerOfMonthHistoryTable } from '@/components/PlayerOfMonthHistoryTable';
import { PlayerOfMonthLeaderboard } from '@/components/PlayerOfMonthLeaderboard';
import { PlayerScoreBoxPlot } from '@/components/PlayerScoreBoxPlot';
import { ScoreHistogramChart } from '@/components/ScoreHistogramChart';
import { StatsLeaderboardTable } from '@/components/StatsLeaderboardTable';
import { StatsPlayerFilter } from '@/components/StatsPlayerFilter';
import { StatsSearch, type StatsSectionView } from '@/components/StatsSearch';
import { WinningScoreByGameSizeChart } from '@/components/WinningScoreByGameSizeChart';
import { formatAverage, formatPercent, formatSignedNumber } from '@/lib/format';
import { PlayerTier } from '@/lib/player-tier';
import { getPlayers } from '@/lib/players';
import { getSettings } from '@/lib/settings';
import { getRatingReplay } from '@/lib/ratings';
import { resolveStatsFilter } from '@/lib/stats-filter';
import { parseStatsSelectedPlayerIds } from '@/lib/stats-page-filters';
import {
  getGameActivityTimestamps,
  getPlayerAttendanceEvents,
  getPlayerClutchFactors,
  getPlayerConsistencyRatings,
  getPlayerCumulativeScoreStats,
  getPlayerCurrentWinStreaks,
  getPlayerDominanceIndex,
  getPlayerHeadToHeadRecords,
  getPlayerKingmakers,
  getPlayerNailBiterRecords,
  getPerPlayerScoreDistributions,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerNormalizedScoreStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getRivalryAggregates,
  getScoreHistogramBuckets,
  getPlayerStreakRecords,
  getPlayerWinEvents,
  getSingleGameRecords,
  getTierShowdownStats,
  getWinningScoreByGameSize,
  getWinningScoreComparison,
  getPlayerWinRates,
  type PlayerIdentity,
  type RivalryAggregate,
  type SingleGameRecords,
} from '@/lib/stats';
import { STATS_SECTIONS, type StatsSectionId } from '@/lib/stats-sections';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Stats — HarborStats' };

interface StatsCardMeta {
  id: string;
  title: string;
  description: string;
  badge: string | undefined;
  span: 'single' | 'full';
  section: StatsSectionId;
}

function PlayerName({ name, tier }: { name: string; tier: PlayerTier }) {
  return (
    <div className="min-w-0">
      <span className={tier === PlayerTier.Premium ? `font-semibold text-(--gold)` : ''}>
        {name}
      </span>
    </div>
  );
}

function MarginWinnerNames({ winners }: { winners: PlayerIdentity[] }) {
  return (
    <>
      {winners.map((winner, index) => (
        <Fragment key={winner.playerId}>
          {index > 0 ? ', ' : null}
          <span className={winner.tier === PlayerTier.Premium ? `font-semibold text-(--gold)` : ''}>
            {winner.name}
          </span>
        </Fragment>
      ))}
    </>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-(--cream)/50">{children}</p>;
}

function ScoreLeaderboardEmptyState({
  hasRecordedStats,
  minGames,
}: {
  hasRecordedStats: boolean;
  minGames: number;
}) {
  if (!hasRecordedStats) {
    return <EmptyState>No games recorded yet.</EmptyState>;
  }

  return <EmptyState>No players have played {minGames}+ games yet.</EmptyState>;
}

function ScoreComparisonMetric({
  label,
  value,
  rowLabel,
}: {
  label: string;
  value: number;
  rowLabel: string;
}) {
  return (
    <div
      className="
      rounded-xl border border-(--border-gold-subtle) bg-(--surface-subtle) p-3
    "
    >
      <p
        className="
        text-[10px] font-medium tracking-[0.18em] text-(--cream)/45 uppercase
      "
      >
        {label}
      </p>
      <p className="mt-2 font-semibold text-(--gold) tabular-nums">{formatAverage(value)}</p>
      <p className="mt-1 text-xs text-(--cream)/55">{rowLabel}</p>
    </div>
  );
}

function formatTierLabel(tier: PlayerTier) {
  return tier === PlayerTier.Premium ? 'Premium' : 'Standard';
}

function formatWinLabel(count: number) {
  return `${count} win${count === 1 ? '' : 's'}`;
}

function formatPointLabel(count: number) {
  return `${count} point${count === 1 ? '' : 's'}`;
}

function formatMarginLabel(count: number) {
  return `${count}-point margin`;
}

function comparePlayerIdentity(left: PlayerIdentity, right: PlayerIdentity) {
  if (left.tier !== right.tier) {
    return left.tier === PlayerTier.Premium ? -1 : 1;
  }

  return left.name.localeCompare(right.name) || left.playerId - right.playerId;
}

function getRivalrySortNames(pair: RivalryAggregate) {
  return [pair.playerA.name, pair.playerB.name].sort((left, right) => left.localeCompare(right));
}

function compareRivalriesAlphabetically(left: RivalryAggregate, right: RivalryAggregate) {
  const [leftFirst, leftSecond] = getRivalrySortNames(left);
  const [rightFirst, rightSecond] = getRivalrySortNames(right);

  return leftFirst.localeCompare(rightFirst) || leftSecond.localeCompare(rightSecond);
}

function compareClosestRivalries(left: RivalryAggregate, right: RivalryAggregate) {
  return (
    left.closenessScore - right.closenessScore ||
    right.gamesTogether - left.gamesTogether ||
    compareRivalriesAlphabetically(left, right)
  );
}

function compareLopsidedRivalries(left: RivalryAggregate, right: RivalryAggregate) {
  return (
    right.closenessScore - left.closenessScore ||
    right.gamesTogether - left.gamesTogether ||
    compareRivalriesAlphabetically(left, right)
  );
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

function StreakPeriod({
  startedAt,
  endedAt,
}: {
  startedAt: string | null;
  endedAt: string | null;
}) {
  if (!startedAt || !endedAt) {
    return '—';
  }

  if (startedAt === endedAt) {
    return <FormattedDate iso={startedAt} className="inline text-(--cream)/70" dateOnly />;
  }

  return (
    <span>
      <FormattedDate iso={startedAt} className="inline text-(--cream)/70" dateOnly />
      <span className="text-(--cream)/45"> - </span>
      <FormattedDate iso={endedAt} className="inline text-(--cream)/70" dateOnly />
    </span>
  );
}

function SingleGameRecordRow({
  label,
  value,
  detail,
  playedAt,
}: {
  label: string;
  value: string;
  detail: ReactNode;
  playedAt: string;
}) {
  return (
    <div
      className="
      rounded-xl border border-(--border-gold-subtle) bg-(--surface-subtle) p-3
    "
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="
            text-[10px] font-medium tracking-[0.18em] text-(--cream)/45
            uppercase
          "
          >
            {label}
          </p>
          <div className="mt-1 text-sm text-(--cream)">{detail}</div>
        </div>
        <p
          className="
            shrink-0 text-right font-semibold text-(--gold) tabular-nums
          "
        >
          {value}
        </p>
      </div>
      <FormattedDate iso={playedAt} className="mt-2 block text-xs text-(--cream)/50" />
    </div>
  );
}

function SingleGameRecordsContent({ records }: { records: SingleGameRecords }) {
  const recordRows = [
    records.highestScore
      ? {
          key: 'highest-score',
          label: 'Highest Score',
          value: formatPointLabel(records.highestScore.score),
          detail: <PlayerName name={records.highestScore.name} tier={records.highestScore.tier} />,
          playedAt: records.highestScore.playedAt,
        }
      : null,
    records.lowestWinningScore
      ? {
          key: 'lowest-winning-score',
          label: 'Lowest Winning Score',
          value: formatPointLabel(records.lowestWinningScore.score),
          detail: (
            <PlayerName
              name={records.lowestWinningScore.name}
              tier={records.lowestWinningScore.tier}
            />
          ),
          playedAt: records.lowestWinningScore.playedAt,
        }
      : null,
    records.biggestBlowout
      ? {
          key: 'biggest-blowout',
          label: 'Biggest Blowout',
          value: formatMarginLabel(records.biggestBlowout.margin),
          detail: (
            <span>
              <MarginWinnerNames winners={records.biggestBlowout.winners} />
              <span className="text-(--cream)/50">
                {' '}
                ({records.biggestBlowout.winnerScore}-{records.biggestBlowout.runnerUpScore})
              </span>
            </span>
          ),
          playedAt: records.biggestBlowout.playedAt,
        }
      : null,
    records.closestGame
      ? {
          key: 'closest-game',
          label: 'Closest Game',
          value: formatMarginLabel(records.closestGame.margin),
          detail: (
            <span>
              <MarginWinnerNames winners={records.closestGame.winners} />
              <span className="text-(--cream)/50">
                {' '}
                ({records.closestGame.winnerScore}-{records.closestGame.runnerUpScore})
              </span>
            </span>
          ),
          playedAt: records.closestGame.playedAt,
        }
      : null,
  ].filter((record): record is NonNullable<typeof record> => record !== null);

  if (recordRows.length === 0) {
    return <EmptyState>No games recorded yet.</EmptyState>;
  }

  return (
    <div className="grid gap-3">
      {recordRows.map((record) => (
        <SingleGameRecordRow
          key={record.key}
          label={record.label}
          value={record.value}
          detail={record.detail}
          playedAt={record.playedAt}
        />
      ))}
    </div>
  );
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function StatsPage({ searchParams }: Props) {
  const [params, players] = await Promise.all([searchParams, getPlayers()]);
  const allPlayerIds = players.map((player) => player.id);
  const selectedPlayerIds = parseStatsSelectedPlayerIds(params.player, allPlayerIds);
  const filter = await resolveStatsFilter(selectedPlayerIds, allPlayerIds);

  const [
    winRates,
    settings,
    scoreStats,
    scoreHistogramBuckets,
    perPlayerScoreDistributions,
    cumulativeScoreStats,
    normalizedScoreStats,
    podiumRates,
    finishBreakdowns,
    tierShowdown,
    expectedVsActualWins,
    gameActivityTimestamps,
    participationRates,
    playerAttendanceEvents,
    currentWinStreaks,
    playerWinEvents,
    playerStreakRecords,
    singleGameRecords,
    winningScoreComparison,
    winningScoreByGameSize,
    headToHeadRecords,
    rivalryAggregates,
    consistencyRatings,
    dominanceIndex,
    nailBiterRecords,
    clutchFactors,
    kingmakers,
    ratingReplay,
  ] = await Promise.all([
    getPlayerWinRates(filter),
    getSettings(),
    getPlayerScoreStats(filter),
    getScoreHistogramBuckets(filter),
    getPerPlayerScoreDistributions(filter),
    getPlayerCumulativeScoreStats(filter),
    getPlayerNormalizedScoreStats(filter),
    getPlayerPodiumRates(filter),
    getPlayerFinishBreakdowns(filter),
    getTierShowdownStats(filter),
    getPlayerExpectedVsActualWins(filter),
    getGameActivityTimestamps(filter),
    getPlayerParticipationRates(filter),
    getPlayerAttendanceEvents(filter),
    getPlayerCurrentWinStreaks(filter),
    getPlayerWinEvents(filter),
    getPlayerStreakRecords(filter),
    getSingleGameRecords(filter),
    getWinningScoreComparison(filter),
    getWinningScoreByGameSize(filter),
    getPlayerHeadToHeadRecords(filter),
    getRivalryAggregates(filter),
    getPlayerConsistencyRatings(filter),
    getPlayerDominanceIndex(filter),
    getPlayerNailBiterRecords(filter),
    getPlayerClutchFactors(filter),
    getPlayerKingmakers(filter),
    getRatingReplay(filter),
  ]);

  const winRateQualified = winRates
    .filter((player) => player.games >= settings.winRateMinGames)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
  const ratedPlayers = ratingReplay.players.filter((player) => player.gamesPlayed > 0);
  const podiumRateQualified = podiumRates
    .filter((player) => player.games >= settings.podiumRateMinGames)
    .sort((a, b) => b.podiumRate - a.podiumRate || b.podiums - a.podiums);

  const minGamesForScoreLeaderboards = 3;
  const scoreStatsQualified = scoreStats.filter(
    (player) => player.games >= minGamesForScoreLeaderboards,
  );
  const medianSorted = [...scoreStatsQualified].sort((a, b) => b.medianScore - a.medianScore);
  const cumulativeScoreStatsByPlayerId = new Map(
    cumulativeScoreStats.map((player) => [player.playerId, player]),
  );
  const normalizedScoreStatsQualified = normalizedScoreStats.filter(
    (player) => player.games >= minGamesForScoreLeaderboards,
  );
  const normalizedMedianSorted = [...normalizedScoreStatsQualified].sort(
    (a, b) => b.medianScore - a.medianScore,
  );
  const scoreLeaderboardBadge = `Min ${minGamesForScoreLeaderboards} games`;
  const minGamesForScoreDistribution = 5;
  const qualifiedScoreDistributions = perPlayerScoreDistributions.filter(
    (player) => player.count >= minGamesForScoreDistribution,
  );
  const filteredScoreDistributionCount =
    perPlayerScoreDistributions.length - qualifiedScoreDistributions.length;
  const scoreDistributionEmptyState =
    filteredScoreDistributionCount > 0 ? (
      <EmptyState>
        Not enough data yet. {filteredScoreDistributionCount} player
        {filteredScoreDistributionCount === 1 ? '' : 's'}{' '}
        {filteredScoreDistributionCount === 1 ? 'was' : 'were'} filtered out for having fewer than{' '}
        {minGamesForScoreDistribution} games.
      </EmptyState>
    ) : (
      <EmptyState>No scores recorded yet.</EmptyState>
    );
  const podiumRateEmptyState =
    settings.podiumRateMinGames > 0 ? (
      <EmptyState>
        No players have played {settings.podiumRateMinGames}+ game
        {settings.podiumRateMinGames === 1 ? '' : 's'} yet.
      </EmptyState>
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    );
  const headToHeadPlayers = winRates
    .map((player) => ({
      playerId: player.playerId,
      name: player.name,
      tier: player.tier,
    }))
    .sort(comparePlayerIdentity);
  const qualifiedRivalries = rivalryAggregates.filter(
    (pair) =>
      pair.gamesTogether >= settings.winRateMinGames && Number.isFinite(pair.closenessScore),
  );
  const [closestRivalry] = [...qualifiedRivalries].sort(compareClosestRivalries);
  const [lopsidedRivalry] = [...qualifiedRivalries].sort(compareLopsidedRivalries);
  const rivalryEmptyMessage =
    settings.winRateMinGames > 0
      ? 'No rivalries meet the minimum game threshold yet.'
      : 'No decided rivalries recorded yet.';

  const longestWinStreakRecords = [...playerStreakRecords].sort(
    (a, b) =>
      b.longestWinStreak - a.longestWinStreak ||
      compareNullableIsoDesc(a.longestWinStreakEndedAt, b.longestWinStreakEndedAt) ||
      a.name.localeCompare(b.name),
  );
  const bridesmaidSorted = [...finishBreakdowns].sort(
    (a, b) =>
      b.seconds - a.seconds ||
      b.secondRate - a.secondRate ||
      b.games - a.games ||
      a.name.localeCompare(b.name),
  );

  const { statCardMinGames } = settings;
  const statCardBadge =
    statCardMinGames > 0
      ? `Min ${statCardMinGames} game${statCardMinGames === 1 ? '' : 's'}`
      : undefined;
  const gamesByPlayerId = new Map(winRates.map((player) => [player.playerId, player.games]));
  const meetsStatCardGate = (playerId: number) =>
    (gamesByPlayerId.get(playerId) ?? 0) >= statCardMinGames;

  const consistencyQualified = consistencyRatings.filter((player) =>
    meetsStatCardGate(player.playerId),
  );
  const dominanceQualified = dominanceIndex.filter((player) => meetsStatCardGate(player.playerId));
  const clutchQualified = clutchFactors.filter(
    (player) => player.delta !== null && player.smallGames + player.bigGames >= statCardMinGames,
  );
  const nailBiterQualified = nailBiterRecords.filter((player) =>
    meetsStatCardGate(player.playerId),
  );
  const kingmakerQualified = kingmakers.filter((player) => meetsStatCardGate(player.playerId));
  const statCardEmptyMessage =
    statCardMinGames > 0
      ? `No players have played ${statCardMinGames}+ game${statCardMinGames === 1 ? '' : 's'} yet.`
      : 'No games recorded yet.';

  const statsCards: StatsCardMeta[] = [
    {
      id: 'power-ranking',
      title: 'Power Ranking',
      description: 'Multiplayer Elo starts at 1500 with K 24 pairwise comparisons.',
      badge: undefined,
      span: 'single',
      section: 'ratings',
    },
    {
      id: 'rating-history',
      title: 'Rating History',
      description: 'Replayable multiplayer Elo after every rated game.',
      badge: undefined,
      span: 'single',
      section: 'ratings',
    },
    {
      id: 'total-wins',
      title: 'Total Wins',
      description: 'All-time victory leaderboard with win rate alongside total finishes.',
      badge: undefined,
      span: 'single',
      section: 'headline',
    },
    {
      id: 'win-rate',
      title: 'Win Rate',
      description: 'Qualified players ranked by share of games won.',
      badge:
        settings.winRateMinGames > 0
          ? `Min ${settings.winRateMinGames} game${settings.winRateMinGames === 1 ? '' : 's'}`
          : undefined,
      span: 'single',
      section: 'headline',
    },
    {
      id: 'current-win-streak',
      title: 'Current Win Streak',
      description: 'Active streak leaderboard based on each player’s own appearance history.',
      badge: undefined,
      span: 'single',
      section: 'headline',
    },
    {
      id: 'total-vp',
      title: 'Total VP',
      description: 'Cumulative points scored across every recorded game.',
      badge: undefined,
      span: 'single',
      section: 'headline',
    },
    {
      id: 'avg-score',
      title: 'Average Score',
      description: 'Scoring leaderboard ranked by each player’s all-time average.',
      badge: scoreLeaderboardBadge,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'median-score',
      title: 'Median Score',
      description: 'Typical scoring performance with median values to smooth out spikes.',
      badge: scoreLeaderboardBadge,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'normalized-avg-score',
      title: 'Normalized Average Score',
      description: 'Average share of each game’s winning score across all appearances.',
      badge: `${scoreLeaderboardBadge}; Winner = 100%`,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'normalized-median-score',
      title: 'Normalized Median Score',
      description:
        'Typical share of each game’s winning score, using medians to smooth out spikes.',
      badge: `${scoreLeaderboardBadge}; Winner = 100%`,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'winning-vs-losing-score',
      title: 'Winning vs Losing Score',
      description:
        'Average score for winner rows versus non-winner rows across all recorded games.',
      badge: undefined,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'winning-score-by-game-size',
      title: 'Winning Score by Game Size',
      description: 'Average winning score grouped by game size, from 3P to 6P and beyond.',
      badge: undefined,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'score-histogram',
      title: 'Score Histogram',
      description: 'Distribution of every recorded individual score across the full game history.',
      badge: undefined,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'score-distribution-by-player',
      title: 'Score Distribution by Player',
      description: 'Per-player score spread using quartiles, medians, and min/max whiskers.',
      badge: 'Min 5 games',
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'consistency-rating',
      title: 'Consistency Rating',
      description: 'Players ranked by the smallest score standard deviation — steadiest first.',
      badge: statCardBadge,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'dominance-index',
      title: 'Dominance Index',
      description: 'Average share of each game’s total points, showing who commands the board.',
      badge: statCardBadge,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'podium-rate',
      title: 'Podium Rate',
      description: 'How often each player finishes first or second.',
      badge:
        settings.podiumRateMinGames > 0
          ? `Min ${settings.podiumRateMinGames} game${settings.podiumRateMinGames === 1 ? '' : 's'}`
          : undefined,
      span: 'single',
      section: 'finishes',
    },
    {
      id: 'bridesmaid',
      title: 'Bridesmaid',
      description: 'Most second-place finishes across all recorded games.',
      badge: undefined,
      span: 'single',
      section: 'finishes',
    },
    {
      id: 'expected-vs-actual-wins',
      title: 'Expected vs Actual Wins',
      description: 'Actual wins versus the baseline 1/N expectation for each game played.',
      badge: undefined,
      span: 'single',
      section: 'finishes',
    },
    {
      id: 'finish-breakdown',
      title: 'Finish Breakdown',
      description: 'Share of games each player finished first, second, third, or last.',
      badge: undefined,
      span: 'full',
      section: 'finishes',
    },
    {
      id: 'tier-showdown',
      title: 'Tier Showdown',
      description: 'Premium and standard tier players compared by wins per appearance.',
      badge: undefined,
      span: 'full',
      section: 'finishes',
    },
    {
      id: 'nail-biter-record',
      title: 'Nail-Biter Record',
      description: 'How players fare in tight games decided by two points or fewer.',
      badge: statCardBadge,
      span: 'single',
      section: 'finishes',
    },
    {
      id: 'clutch-factor',
      title: 'Clutch Factor',
      description:
        'Win rate at full tables (5–6P) versus small tables (3–4P), and the swing between them.',
      badge: statCardBadge,
      span: 'single',
      section: 'finishes',
    },
    {
      id: 'closest-rivalry',
      title: 'Closest Rivalry',
      description: 'The most evenly matched qualifying pair by decided head-to-head rate.',
      badge:
        settings.winRateMinGames > 0
          ? `Min ${settings.winRateMinGames} game${settings.winRateMinGames === 1 ? '' : 's'}`
          : undefined,
      span: 'single',
      section: 'head-to-head',
    },
    {
      id: 'lopsided-rivalry',
      title: 'Most Lopsided Rivalry',
      description: 'The qualifying pair with the biggest decided head-to-head edge.',
      badge:
        settings.winRateMinGames > 0
          ? `Min ${settings.winRateMinGames} game${settings.winRateMinGames === 1 ? '' : 's'}`
          : undefined,
      span: 'single',
      section: 'head-to-head',
    },
    {
      id: 'head-to-head-matrix',
      title: 'Head-to-Head Matrix',
      description:
        'Directional records against every opponent, including how often each player outscored them.',
      badge: undefined,
      span: 'full',
      section: 'head-to-head',
    },
    {
      id: 'kingmaker',
      title: 'Kingmaker',
      description:
        'When each player loses, the opponent who wins most above the 1/(N−1) baseline — their unwitting benefactor.',
      badge: statCardBadge,
      span: 'single',
      section: 'head-to-head',
    },
    {
      id: 'games-over-time',
      title: 'Games Over Time',
      description:
        'Game frequency plotted across weekly or monthly activity buckets in your local time.',
      badge: undefined,
      span: 'single',
      section: 'activity',
    },
    {
      id: 'cumulative-games',
      title: 'Cumulative Games',
      description:
        'Running total of recorded games over time, bucketed by week or month in your local time.',
      badge: undefined,
      span: 'single',
      section: 'activity',
    },
    {
      id: 'player-attendance-over-time',
      title: 'Player Attendance Over Time',
      description:
        'Stacked appearance totals showing who participated in each activity bucket in your local time.',
      badge: undefined,
      span: 'single',
      section: 'activity',
    },
    {
      id: 'participation-rate',
      title: 'Participation Rate',
      description: 'Share of all recorded games each player has appeared in.',
      badge: undefined,
      span: 'full',
      section: 'activity',
    },
    {
      id: 'calendar-heatmap',
      title: 'Calendar Heatmap',
      description:
        'Daily game frequency across the last 12 months or any recorded year in your local time.',
      badge: undefined,
      span: 'full',
      section: 'activity',
    },
    {
      id: 'day-of-week-pattern',
      title: 'Day-of-Week Pattern',
      description: 'How many games were played on each weekday in your local time.',
      badge: undefined,
      span: 'single',
      section: 'activity',
    },
    {
      id: 'time-of-day-pattern',
      title: 'Time-of-Day Pattern',
      description: 'Local start-time distribution bucketed by hour of day.',
      badge: undefined,
      span: 'single',
      section: 'activity',
    },
    {
      id: 'average-games-per-session',
      title: 'Average Games per Session',
      description: 'Mean games per local-calendar-day session.',
      badge: undefined,
      span: 'single',
      section: 'activity',
    },
    {
      id: 'most-wins-in-week',
      title: 'Most Wins in a Week',
      description: 'Each player’s personal-best win total in a local calendar week.',
      badge: undefined,
      span: 'single',
      section: 'records',
    },
    {
      id: 'most-wins-in-month',
      title: 'Most Wins in a Month',
      description: 'Each player’s personal-best win total in a local calendar month.',
      badge: undefined,
      span: 'single',
      section: 'records',
    },
    {
      id: 'player-of-month',
      title: 'Player of the Month',
      description: 'Most wins this calendar month.',
      badge: undefined,
      span: 'single',
      section: 'records',
    },
    {
      id: 'player-of-month-history',
      title: 'Player of the Month History',
      description: 'Monthly winners from all previous completed months.',
      badge: undefined,
      span: 'single',
      section: 'records',
    },
    {
      id: 'single-game-records',
      title: 'Single-Game Records',
      description: 'Peak scores, squeaky wins, blowouts, and nail-biters from recorded games.',
      badge: undefined,
      span: 'single',
      section: 'records',
    },
    {
      id: 'longest-win-streak-ever',
      title: 'Longest Win Streak Ever',
      description: 'Each player’s all-time record winning run and when it happened.',
      badge: undefined,
      span: 'single',
      section: 'records',
    },
    {
      id: 'longest-gap-between-games',
      title: 'Longest Gap Between Games',
      description: 'Longest stretch of idle local calendar days between consecutive games.',
      badge: undefined,
      span: 'single',
      section: 'records',
    },
    {
      id: 'busiest-records',
      title: 'Busiest Day / Week / Month Records',
      description: 'Most active local day, ISO week, and month by total games played.',
      badge: undefined,
      span: 'single',
      section: 'records',
    },
  ];

  const cardById = Object.fromEntries(statsCards.map((card) => [card.id, card])) as Record<
    string,
    StatsCardMeta
  >;
  const cardsBySection = Object.fromEntries(
    STATS_SECTIONS.map((section) => [
      section.id,
      statsCards.filter((card) => card.section === section.id),
    ]),
  ) as Record<StatsSectionId, StatsCardMeta[]>;

  const cardContents: Record<string, ReactNode> = {
    'power-ranking':
      ratedPlayers.length === 0 ? (
        <EmptyState>No rated multiplayer games yet.</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Elo', align: 'right', sortKey: 'rating' },
            { label: 'Last', align: 'right', sortKey: 'change' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'rating', direction: 'desc' }}
          rows={ratedPlayers.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              rating: player.displayRating,
              change: player.lastGameChange,
              games: player.gamesPlayed,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                  {player.provisional ? (
                    <span
                      className="
              ml-2 text-xs text-(--cream)/55
            "
                    >
                      Provisional
                    </span>
                  ) : null}
                </td>
                <td
                  className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            "
                >
                  {player.displayRating}
                </td>
                <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
                  {formatSignedNumber(player.lastGameChange)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
                  {player.gamesPlayed}
                </td>
              </>
            ),
          }))}
        />
      ),
    'rating-history': <RatingHistoryChart players={ratedPlayers} rosterPlayerIds={allPlayerIds} />,
    'total-wins':
      winRates.length === 0 ? (
        <EmptyState>No wins recorded yet.</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Wins', align: 'right', sortKey: 'wins' },
            { label: 'Win Rate', align: 'right', sortKey: 'winRate' },
          ]}
          initialSort={{ key: 'wins', direction: 'desc' }}
          rows={winRates.map((player) => ({
            key: player.playerId,
            sortValues: { player: player.name, wins: player.wins, winRate: player.winRate },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">{player.wins}</td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {formatPercent(player.winRate, 1)}
                </td>
              </>
            ),
          }))}
        />
      ),
    'win-rate':
      winRateQualified.length === 0 ? (
        <EmptyState>
          No players have played {settings.winRateMinGames}+ game
          {settings.winRateMinGames === 1 ? '' : 's'} yet.
        </EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Win Rate', align: 'right', sortKey: 'winRate' },
            { label: 'Wins', align: 'right', sortKey: 'wins' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'winRate', direction: 'desc' }}
          rows={winRateQualified.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              winRate: player.winRate,
              wins: player.wins,
              games: player.games,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatPercent(player.winRate, 1)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">{player.wins}</td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    'current-win-streak':
      currentWinStreaks.length > 0 ? (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Streak', align: 'right', sortKey: 'streak' },
            { label: 'Last Win', align: 'right', sortKey: 'lastWin', sortType: 'string' },
          ]}
          initialSort={{ key: 'streak', direction: 'desc' }}
          rows={currentWinStreaks.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              streak: player.streak,
              lastWin: player.mostRecentWin,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatWinLabel(player.streak)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream)/70">
                  {player.mostRecentWin ? (
                    <FormattedDate
                      iso={player.mostRecentWin}
                      className="inline text-(--cream)/70"
                    />
                  ) : (
                    '—'
                  )}
                </td>
              </>
            ),
          }))}
        />
      ) : (
        <EmptyState>No games recorded yet.</EmptyState>
      ),
    'total-vp': cumulativeScoreStats.some((player) => player.games > 0) ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10', rank: true },
          { label: 'Player', sortKey: 'player', sortType: 'string' },
          { label: 'Total VP', align: 'right', sortKey: 'totalScore' },
          { label: 'Games', align: 'right', sortKey: 'games' },
        ]}
        initialSort={{ key: 'totalScore', direction: 'desc' }}
        rows={cumulativeScoreStats.map((player) => ({
          key: player.playerId,
          sortValues: { player: player.name, totalScore: player.totalScore, games: player.games },
          cells: (
            <>
              <td className="px-3 py-2 text-(--cream)">
                <PlayerName name={player.name} tier={player.tier} />
              </td>
              <td
                className="
                  px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
                "
              >
                {player.totalScore}
              </td>
              <td
                className="
                px-3 py-2 text-right text-(--cream)/70 tabular-nums
              "
              >
                {player.games}
              </td>
            </>
          ),
        }))}
      />
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    ),
    'avg-score':
      scoreStatsQualified.length === 0 ? (
        <ScoreLeaderboardEmptyState
          hasRecordedStats={scoreStats.length > 0}
          minGames={minGamesForScoreLeaderboards}
        />
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Avg Score', align: 'right', sortKey: 'avgScore' },
            { label: 'Total VP', align: 'right', sortKey: 'totalScore' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'avgScore', direction: 'desc' }}
          rows={scoreStatsQualified.map((player) => {
            const cumulativeScoreStat = cumulativeScoreStatsByPlayerId.get(player.playerId);

            return {
              key: player.playerId,
              sortValues: {
                player: player.name,
                avgScore: player.avgScore,
                totalScore: cumulativeScoreStat?.totalScore ?? 0,
                games: player.games,
              },
              cells: (
                <>
                  <td className="px-3 py-2 text-(--cream)">
                    <PlayerName name={player.name} tier={player.tier} />
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    "
                  >
                    {formatAverage(player.avgScore)}
                  </td>
                  <td
                    className="
                    px-3 py-2 text-right text-(--cream) tabular-nums
                  "
                  >
                    {cumulativeScoreStat?.totalScore ?? 0}
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    "
                  >
                    {player.games}
                  </td>
                </>
              ),
            };
          })}
        />
      ),
    'median-score':
      medianSorted.length === 0 ? (
        <ScoreLeaderboardEmptyState
          hasRecordedStats={scoreStats.length > 0}
          minGames={minGamesForScoreLeaderboards}
        />
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Median Score', align: 'right', sortKey: 'medianScore' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'medianScore', direction: 'desc' }}
          rows={medianSorted.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              medianScore: player.medianScore,
              games: player.games,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatAverage(player.medianScore)}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    'winning-vs-losing-score':
      winningScoreComparison.winnerRows + winningScoreComparison.nonWinnerRows === 0 ? (
        <EmptyState>No games recorded yet.</EmptyState>
      ) : (
        <div className="space-y-4">
          <div
            className="
              grid gap-3
              sm:grid-cols-2
            "
          >
            <ScoreComparisonMetric
              label="Winners"
              value={winningScoreComparison.avgWinningScore}
              rowLabel={`${winningScoreComparison.winnerRows} winner rows`}
            />
            <ScoreComparisonMetric
              label="Non-Winners"
              value={winningScoreComparison.avgLosingScore}
              rowLabel={`${winningScoreComparison.nonWinnerRows} non-winner rows`}
            />
          </div>
          <div
            className="
              rounded-xl border border-(--border-gold-subtle)
              bg-(--surface-subtle) p-3
            "
          >
            <p
              className="
              text-[10px] font-medium tracking-[0.18em] text-(--cream)/45
              uppercase
            "
            >
              Gap
            </p>
            <p className="mt-2 font-semibold text-(--gold) tabular-nums">
              {formatSignedNumber(winningScoreComparison.scoreGap)}
            </p>
          </div>
        </div>
      ),
    'normalized-avg-score':
      normalizedScoreStatsQualified.length === 0 ? (
        <ScoreLeaderboardEmptyState
          hasRecordedStats={normalizedScoreStats.length > 0}
          minGames={minGamesForScoreLeaderboards}
        />
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Normalized Avg', align: 'right', sortKey: 'avgScore' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'avgScore', direction: 'desc' }}
          rows={normalizedScoreStatsQualified.map((player) => ({
            key: player.playerId,
            sortValues: { player: player.name, avgScore: player.avgScore, games: player.games },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatPercent(player.avgScore, 1)}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    'normalized-median-score':
      normalizedMedianSorted.length === 0 ? (
        <ScoreLeaderboardEmptyState
          hasRecordedStats={normalizedScoreStats.length > 0}
          minGames={minGamesForScoreLeaderboards}
        />
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Normalized Median', align: 'right', sortKey: 'medianScore' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'medianScore', direction: 'desc' }}
          rows={normalizedMedianSorted.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              medianScore: player.medianScore,
              games: player.games,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatPercent(player.medianScore, 1)}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    'winning-score-by-game-size': <WinningScoreByGameSizeChart buckets={winningScoreByGameSize} />,
    'score-histogram': <ScoreHistogramChart buckets={scoreHistogramBuckets} />,
    'score-distribution-by-player':
      qualifiedScoreDistributions.length > 0 ? (
        <PlayerScoreBoxPlot distributions={qualifiedScoreDistributions} />
      ) : (
        scoreDistributionEmptyState
      ),
    'podium-rate':
      podiumRateQualified.length === 0 ? (
        podiumRateEmptyState
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Podium Rate', align: 'right', sortKey: 'podiumRate' },
            { label: 'Podiums', align: 'right', sortKey: 'podiums' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'podiumRate', direction: 'desc' }}
          rows={podiumRateQualified.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              podiumRate: player.podiumRate,
              podiums: player.podiums,
              games: player.games,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatPercent(player.podiumRate, 1)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                  {player.podiums}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    bridesmaid:
      bridesmaidSorted.length === 0 ? (
        <EmptyState>No games recorded yet.</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: '2nd Place', align: 'right', sortKey: 'seconds' },
            { label: 'Rate', align: 'right', sortKey: 'secondRate' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'seconds', direction: 'desc' }}
          rows={bridesmaidSorted.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              seconds: player.seconds,
              secondRate: player.secondRate,
              games: player.games,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {player.seconds}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                  {formatPercent(player.secondRate, 1)}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    'expected-vs-actual-wins': expectedVsActualWins.some((player) => player.games > 0) ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10', rank: true },
          { label: 'Player', sortKey: 'player', sortType: 'string' },
          { label: 'Delta', align: 'right', sortKey: 'winDelta' },
          { label: 'Actual Wins', align: 'right', sortKey: 'wins' },
          { label: 'Expected Wins', align: 'right', sortKey: 'expectedWins' },
        ]}
        initialSort={{ key: 'winDelta', direction: 'desc' }}
        rows={expectedVsActualWins.map((player) => ({
          key: player.playerId,
          sortValues: {
            player: player.name,
            winDelta: player.winDelta,
            wins: player.wins,
            expectedWins: player.expectedWins,
          },
          cells: (
            <>
              <td className="px-3 py-2 text-(--cream)">
                <PlayerName name={player.name} tier={player.tier} />
              </td>
              <td
                className={`
                  px-3 py-2 text-right font-semibold tabular-nums
                  ${player.winDelta >= 0 ? 'text-(--gold)' : 'text-(--cream)'}
                `}
              >
                {formatSignedNumber(player.winDelta)}
              </td>
              <td className="px-3 py-2 text-right text-(--cream) tabular-nums">{player.wins}</td>
              <td
                className="
                px-3 py-2 text-right text-(--cream)/70 tabular-nums
              "
              >
                {formatAverage(player.expectedWins)}
              </td>
            </>
          ),
        }))}
      />
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    ),
    'finish-breakdown':
      finishBreakdowns.length === 0 ? (
        <EmptyState>No games recorded yet.</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: '1st', align: 'right', sortKey: 'firstRate' },
            { label: '2nd', align: 'right', sortKey: 'secondRate' },
            { label: '3rd', align: 'right', sortKey: 'thirdRate' },
            { label: 'Last', align: 'right', sortKey: 'lastRate' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'firstRate', direction: 'desc' }}
          rows={finishBreakdowns.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              firstRate: player.firstRate,
              secondRate: player.secondRate,
              thirdRate: player.thirdRate,
              lastRate: player.lastRate,
              games: player.games,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatPercent(player.firstRate, 1)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                  {formatPercent(player.secondRate, 1)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                  {formatPercent(player.thirdRate, 1)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                  {formatPercent(player.lastRate, 1)}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    'tier-showdown': tierShowdown.some((row) => row.appearances > 0) ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10', rank: true },
          { label: 'Tier', sortKey: 'tier', sortType: 'string' },
          { label: 'Win Rate', align: 'right', sortKey: 'winRate' },
          { label: 'Wins', align: 'right', sortKey: 'wins' },
          { label: 'Appearances', align: 'right', sortKey: 'appearances' },
          { label: 'Players', align: 'right', sortKey: 'players' },
        ]}
        initialSort={{ key: 'winRate', direction: 'desc' }}
        rows={tierShowdown.map((row) => ({
          key: row.tier,
          sortValues: {
            tier: formatTierLabel(row.tier),
            winRate: row.winRate,
            wins: row.wins,
            appearances: row.appearances,
            players: row.players,
          },
          cells: (
            <>
              <td className="px-3 py-2 text-(--cream)">
                <span
                  className={row.tier === PlayerTier.Premium ? `font-semibold text-(--gold)` : ''}
                >
                  {formatTierLabel(row.tier)}
                </span>
              </td>
              <td
                className="
                  px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
                "
              >
                {formatPercent(row.winRate, 1)}
              </td>
              <td className="px-3 py-2 text-right text-(--cream) tabular-nums">{row.wins}</td>
              <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                {row.appearances}
              </td>
              <td
                className="
                px-3 py-2 text-right text-(--cream)/70 tabular-nums
              "
              >
                {row.players}
              </td>
            </>
          ),
        }))}
      />
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    ),
    'closest-rivalry': (
      <RivalryCard
        title="Closest Rivalry"
        description="The most evenly matched qualifying pair by decided head-to-head rate."
        badge={cardById['closest-rivalry'].badge}
        pair={closestRivalry ?? null}
        emptyMessage={rivalryEmptyMessage}
      />
    ),
    'lopsided-rivalry': (
      <RivalryCard
        title="Most Lopsided Rivalry"
        description="The qualifying pair with the biggest decided head-to-head edge."
        badge={cardById['lopsided-rivalry'].badge}
        pair={lopsidedRivalry ?? null}
        emptyMessage={rivalryEmptyMessage}
      />
    ),
    'head-to-head-matrix':
      headToHeadPlayers.length > 0 ? (
        <HeadToHeadMatrix records={headToHeadRecords} players={headToHeadPlayers} />
      ) : (
        <EmptyState>No players recorded yet.</EmptyState>
      ),
    'games-over-time': (
      <GamesOverTimeChart playedAtIsos={gameActivityTimestamps} defaultView="week" />
    ),
    'cumulative-games': (
      <CumulativeGamesAreaChart playedAtIsos={gameActivityTimestamps} defaultView="month" />
    ),
    'player-attendance-over-time': (
      <PlayerAttendanceChart
        events={playerAttendanceEvents}
        defaultView="week"
        rosterPlayerIds={allPlayerIds}
      />
    ),
    'participation-rate': participationRates.some((player) => player.totalGames > 0) ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10', rank: true },
          { label: 'Player', sortKey: 'player', sortType: 'string' },
          { label: 'Participation', align: 'right', sortKey: 'participationRate' },
          { label: 'Games Played', align: 'right', sortKey: 'gamesPlayed' },
        ]}
        initialSort={{ key: 'participationRate', direction: 'desc' }}
        rows={participationRates.map((player) => ({
          key: player.playerId,
          sortValues: {
            player: player.name,
            participationRate: player.participationRate,
            gamesPlayed: player.gamesPlayed,
          },
          cells: (
            <>
              <td className="px-3 py-2 text-(--cream)">
                <PlayerName name={player.name} tier={player.tier} />
              </td>
              <td
                className="
                  px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
                "
              >
                {formatPercent(player.participationRate, 1)}
              </td>
              <td
                className="
                px-3 py-2 text-right text-(--cream)/70 tabular-nums
              "
              >
                {player.gamesPlayed}
              </td>
            </>
          ),
        }))}
      />
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    ),
    'calendar-heatmap': (
      <CalendarHeatmap playedAtIsos={gameActivityTimestamps} defaultSelection="recent" />
    ),
    'day-of-week-pattern': (
      <ActivityDistributionChart playedAtIsos={gameActivityTimestamps} variant="weekday" />
    ),
    'time-of-day-pattern': (
      <ActivityDistributionChart playedAtIsos={gameActivityTimestamps} variant="hour" />
    ),
    'average-games-per-session': (
      <AverageGamesPerSessionCard playedAtIsos={gameActivityTimestamps} />
    ),
    'most-wins-in-week': (
      <BestWinRecordsLeaderboard
        players={currentWinStreaks}
        winEvents={playerWinEvents}
        variant="week"
      />
    ),
    'most-wins-in-month': (
      <BestWinRecordsLeaderboard
        players={currentWinStreaks}
        winEvents={playerWinEvents}
        variant="month"
      />
    ),
    'player-of-month': (
      <PlayerOfMonthLeaderboard players={currentWinStreaks} winEvents={playerWinEvents} />
    ),
    'player-of-month-history': (
      <PlayerOfMonthHistoryTable players={currentWinStreaks} winEvents={playerWinEvents} />
    ),
    'single-game-records': <SingleGameRecordsContent records={singleGameRecords} />,
    'longest-win-streak-ever':
      longestWinStreakRecords.length > 0 ? (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Record', align: 'right', sortKey: 'record' },
            { label: 'Period', align: 'right', sortKey: 'period', sortType: 'string' },
          ]}
          initialSort={{ key: 'record', direction: 'desc' }}
          rows={longestWinStreakRecords.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              record: player.longestWinStreak,
              period: player.longestWinStreakStartedAt,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatWinLabel(player.longestWinStreak)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream)/70">
                  <StreakPeriod
                    startedAt={player.longestWinStreakStartedAt}
                    endedAt={player.longestWinStreakEndedAt}
                  />
                </td>
              </>
            ),
          }))}
        />
      ) : (
        <EmptyState>No games recorded yet.</EmptyState>
      ),
    'longest-gap-between-games': <LongestGapCard playedAtIsos={gameActivityTimestamps} />,
    'busiest-records': <BusiestRecordsCard playedAtIsos={gameActivityTimestamps} />,
    'consistency-rating':
      consistencyQualified.length === 0 ? (
        <EmptyState>{statCardEmptyMessage}</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Std Dev', align: 'right', sortKey: 'stdDev', defaultDirection: 'asc' },
            { label: 'Avg', align: 'right', sortKey: 'averageScore' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'stdDev', direction: 'asc' }}
          rows={consistencyQualified.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              stdDev: player.stdDev,
              averageScore: player.averageScore,
              games: player.games,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatAverage(player.stdDev)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                  {formatAverage(player.averageScore)}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    'dominance-index':
      dominanceQualified.length === 0 ? (
        <EmptyState>{statCardEmptyMessage}</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Dominance', align: 'right', sortKey: 'dominance' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'dominance', direction: 'desc' }}
          rows={dominanceQualified.map((player) => ({
            key: player.playerId,
            sortValues: { player: player.name, dominance: player.dominance, games: player.games },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatPercent(player.dominance, 1)}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.games}
                </td>
              </>
            ),
          }))}
        />
      ),
    'nail-biter-record':
      nailBiterQualified.length === 0 ? (
        <EmptyState>{statCardEmptyMessage}</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Win Rate', align: 'right', sortKey: 'winRate' },
            { label: 'Nail-Biters', align: 'right', sortKey: 'nailBiterGames' },
            { label: 'Wins', align: 'right', sortKey: 'nailBiterWins' },
          ]}
          initialSort={{ key: 'winRate', direction: 'desc' }}
          rows={nailBiterQualified.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              winRate: player.winRate,
              nailBiterGames: player.nailBiterGames,
              nailBiterWins: player.nailBiterWins,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatPercent(player.winRate, 1)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                  {player.nailBiterGames}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.nailBiterWins}
                </td>
              </>
            ),
          }))}
        />
      ),
    'clutch-factor':
      clutchQualified.length === 0 ? (
        <EmptyState>{statCardEmptyMessage}</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Full Table', align: 'right', sortKey: 'bigRate' },
            { label: 'Δ vs Small', align: 'right', sortKey: 'delta' },
            { label: 'Games', align: 'right', sortKey: 'games' },
          ]}
          initialSort={{ key: 'bigRate', direction: 'desc' }}
          rows={clutchQualified.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              bigRate: player.bigRate,
              delta: player.delta,
              games: player.smallGames + player.bigGames,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {formatPercent(player.bigRate ?? 0, 1)}
                </td>
                <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
                  {`${formatSignedNumber((player.delta ?? 0) * 100, 1)}%`}
                </td>
                <td
                  className="
                  px-3 py-2 text-right text-(--cream)/70 tabular-nums
                "
                >
                  {player.smallGames + player.bigGames}
                </td>
              </>
            ),
          }))}
        />
      ),
    kingmaker:
      kingmakerQualified.length === 0 ? (
        <EmptyState>{statCardEmptyMessage}</EmptyState>
      ) : (
        <StatsLeaderboardTable
          columns={[
            { label: '#', align: 'center', widthClass: 'w-10', rank: true },
            { label: 'Player', sortKey: 'player', sortType: 'string' },
            { label: 'Benefits', sortKey: 'benefits', sortType: 'string' },
            { label: 'Over Baseline', align: 'right', sortKey: 'edge' },
          ]}
          initialSort={{ key: 'edge', direction: 'desc' }}
          rows={kingmakerQualified.map((player) => ({
            key: player.playerId,
            sortValues: {
              player: player.name,
              benefits: player.beneficiary.name,
              edge: player.edge,
            },
            cells: (
              <>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.name} tier={player.tier} />
                </td>
                <td className="px-3 py-2 text-(--cream)">
                  <PlayerName name={player.beneficiary.name} tier={player.beneficiary.tier} />
                </td>
                <td
                  className="
                    px-3 py-2 text-right font-semibold text-(--gold)
                    tabular-nums
                  "
                >
                  {`${formatSignedNumber(player.edge * 100, 1)}%`}
                </td>
              </>
            ),
          }))}
        />
      ),
  };

  const sections: StatsSectionView[] = STATS_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    subtitle: section.subtitle,
    cards: cardsBySection[section.id].map((card) => ({
      ...card,
      content: cardContents[card.id],
    })),
  }));

  return (
    <div
      className="
        flex h-[calc(100dvh-3rem)] flex-col overflow-hidden
        sm:h-dvh
      "
    >
      <div
        id="stats-scroll"
        className="
          harbor-scrollbar relative flex-1 overflow-y-auto scroll-smooth
        "
      >
        <main>
          <StatsSearch
            sections={sections}
            filter={<StatsPlayerFilter players={players} selectedPlayerIds={selectedPlayerIds} />}
          />
        </main>
      </div>
    </div>
  );
}
