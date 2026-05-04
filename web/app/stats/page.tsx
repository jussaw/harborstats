import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ActivityDistributionChart } from '@/components/ActivityDistributionChart';
import { AverageGamesPerSessionCard } from '@/components/AverageGamesPerSessionCard';
import { BestWinRecordsLeaderboard } from '@/components/BestWinRecordsLeaderboard';
import { BusiestRecordsCard } from '@/components/BusiestRecordsCard';
import { CalendarHeatmap } from '@/components/CalendarHeatmap';
import { CumulativeGamesAreaChart } from '@/components/CumulativeGamesAreaChart';
import { FormattedDate } from '@/components/FormattedDate';
import { GamesOverTimeChart } from '@/components/GamesOverTimeChart';
import { HeadToHeadMatrix } from '@/components/HeadToHeadMatrix';
import { RivalryCard } from '@/components/RivalryCard';
import { LongestGapCard } from '@/components/LongestGapCard';
import { PlayerAttendanceChart } from '@/components/PlayerAttendanceChart';
import { PlayerOfMonthLeaderboard } from '@/components/PlayerOfMonthLeaderboard';
import { PlayerScoreBoxPlot } from '@/components/PlayerScoreBoxPlot';
import { ScoreHistogramChart } from '@/components/ScoreHistogramChart';
import { StatsAnchorNav } from '@/components/StatsAnchorNav';
import { StatsCard } from '@/components/StatsCard';
import { StatsLeaderboardTable } from '@/components/StatsLeaderboardTable';
import { StatsSectionHeader } from '@/components/StatsSectionHeader';
import { WinningScoreByGameSizeChart } from '@/components/WinningScoreByGameSizeChart';
import { formatAverage, formatPercent, formatSignedNumber } from '@/lib/format';
import { PlayerTier } from '@/lib/player-tier';
import { rankWithTies } from '@/lib/rank';
import { getSettings } from '@/lib/settings';
import {
  getGameActivityTimestamps,
  getPlayerAttendanceEvents,
  getPlayerCumulativeScoreStats,
  getPlayerCurrentWinStreaks,
  getPlayerHeadToHeadRecords,
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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Stats — HarborStats' };

type StatsSectionId = 'headline' | 'scoring' | 'finishes' | 'head-to-head' | 'activity' | 'records';

const STATS_SECTIONS: { id: StatsSectionId; title: string; subtitle: string }[] = [
  { id: 'headline', title: 'Headline', subtitle: 'Top-line standings.' },
  { id: 'scoring', title: 'Scoring', subtitle: 'How players score.' },
  { id: 'finishes', title: 'Finishes & Tiers', subtitle: 'Where players land.' },
  { id: 'head-to-head', title: 'Head-to-Head', subtitle: 'Rivalries and matchups.' },
  { id: 'activity', title: 'Activity & Trends', subtitle: 'When games happen.' },
  { id: 'records', title: 'Records & Streaks', subtitle: 'Personal bests and milestones.' },
];

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
      <span className={tier === PlayerTier.Premium ? `
        font-semibold text-(--gold)
      ` : ''}>
        {name}
      </span>
    </div>
  );
}

function RankCell({ rank }: { rank: number }) {
  return (
    <td className="px-3 py-2 text-center text-(--cream)/50 tabular-nums">
      {rank === 1 ? '👑' : rank}
    </td>
  );
}

function DataRow({ children }: { children: ReactNode }) {
  return (
    <tr
      className="
        border-b border-(--gold)/10 bg-(--navy-900)/35 transition-colors
        last:border-0
        hover:bg-(--navy-900)/70
      "
    >
      {children}
    </tr>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-(--cream)/50">{children}</p>;
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
    <div className="rounded-xl border border-(--gold)/10 bg-(--navy-900)/35 p-3">
      <p
        style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
        className="text-xs tracking-widest text-(--cream)/50 uppercase"
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
    <div className="rounded-xl border border-(--gold)/10 bg-(--navy-900)/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            style={{ fontFamily: 'var(--font-cinzel), Georgia, serif' }}
            className="text-xs tracking-widest text-(--cream)/50 uppercase"
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
      <FormattedDate iso={playedAt} className="
        mt-2 block text-xs text-(--cream)/50
      " />
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
              {records.biggestBlowout.winner}
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
              {records.closestGame.winner}
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

export default async function StatsPage() {
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
  ] = await Promise.all([
    getPlayerWinRates(),
    getSettings(),
    getPlayerScoreStats(),
    getScoreHistogramBuckets(),
    getPerPlayerScoreDistributions(),
    getPlayerCumulativeScoreStats(),
    getPlayerNormalizedScoreStats(),
    getPlayerPodiumRates(),
    getPlayerFinishBreakdowns(),
    getTierShowdownStats(),
    getPlayerExpectedVsActualWins(),
    getGameActivityTimestamps(),
    getPlayerParticipationRates(),
    getPlayerAttendanceEvents(),
    getPlayerCurrentWinStreaks(),
    getPlayerWinEvents(),
    getPlayerStreakRecords(),
    getSingleGameRecords(),
    getWinningScoreComparison(),
    getWinningScoreByGameSize(),
    getPlayerHeadToHeadRecords(),
    getRivalryAggregates(),
  ]);

  const winRateQualified = winRates
    .filter((player) => player.games >= settings.winRateMinGames)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
  const podiumRateQualified = podiumRates
    .filter((player) => player.games >= settings.podiumRateMinGames)
    .sort((a, b) => b.podiumRate - a.podiumRate || b.podiums - a.podiums);

  const medianSorted = [...scoreStats].sort((a, b) => b.medianScore - a.medianScore);
  const pointsPerGameSorted = cumulativeScoreStats
    .filter((player) => player.games > 0)
    .sort(
      (a, b) =>
        b.pointsPerGame - a.pointsPerGame ||
        b.totalScore - a.totalScore ||
        b.games - a.games ||
        a.name.localeCompare(b.name),
    );
  const normalizedMedianSorted = [...normalizedScoreStats].sort(
    (a, b) => b.medianScore - a.medianScore,
  );
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
    (pair) => pair.gamesTogether >= settings.winRateMinGames && Number.isFinite(pair.closenessScore),
  );
  const [closestRivalry] = [...qualifiedRivalries].sort(compareClosestRivalries);
  const [lopsidedRivalry] = [...qualifiedRivalries].sort(compareLopsidedRivalries);
  const rivalryEmptyMessage = settings.winRateMinGames > 0
    ? 'No rivalries meet the minimum game threshold yet.'
    : 'No decided rivalries recorded yet.';

  const totalWinsRanks = rankWithTies(winRates, (player) => player.wins);
  const winRateRanks = rankWithTies(winRateQualified, (player) => player.winRate);
  const avgScoreRanks = rankWithTies(scoreStats, (player) => player.avgScore);
  const medianScoreRanks = rankWithTies(medianSorted, (player) => player.medianScore);
  const totalVpRanks = rankWithTies(cumulativeScoreStats, (player) => player.totalScore);
  const pointsPerGameRanks = rankWithTies(pointsPerGameSorted, (player) => player.pointsPerGame);
  const normalizedAvgScoreRanks = rankWithTies(normalizedScoreStats, (player) => player.avgScore);
  const normalizedMedianScoreRanks = rankWithTies(
    normalizedMedianSorted,
    (player) => player.medianScore,
  );
  const podiumRateRanks = rankWithTies(podiumRateQualified, (player) => player.podiumRate);
  const finishBreakdownRanks = rankWithTies(finishBreakdowns, (player) => player.firstRate);
  const tierShowdownRanks = rankWithTies(tierShowdown, (row) => row.winRate);
  const expectedVsActualRanks = rankWithTies(expectedVsActualWins, (player) => player.winDelta);
  const participationRateRanks = rankWithTies(
    participationRates,
    (player) => player.participationRate,
  );
  const currentWinStreakRanks = rankWithTies(currentWinStreaks, (player) => player.streak);
  const longestWinStreakRecords = [...playerStreakRecords].sort(
    (a, b) =>
      b.longestWinStreak - a.longestWinStreak ||
      compareNullableIsoDesc(a.longestWinStreakEndedAt, b.longestWinStreakEndedAt) ||
      a.name.localeCompare(b.name),
  );
  const longestWinStreakRanks = rankWithTies(
    longestWinStreakRecords,
    (player) => player.longestWinStreak,
  );
  const bridesmaidSorted = [...finishBreakdowns].sort(
    (a, b) =>
      b.seconds - a.seconds ||
      b.secondRate - a.secondRate ||
      b.games - a.games ||
      a.name.localeCompare(b.name),
  );
  const bridesmaidRanks = rankWithTies(bridesmaidSorted, (player) => player.seconds);

  const statsCards: StatsCardMeta[] = [
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
      badge: undefined,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'median-score',
      title: 'Median Score',
      description: 'Typical scoring performance with median values to smooth out spikes.',
      badge: undefined,
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'points-per-game',
      title: 'Points per Game',
      description: 'Scoring efficiency based on average points per appearance.',
      badge: undefined,
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
      id: 'normalized-avg-score',
      title: 'Normalized Average Score',
      description: 'Average share of each game’s winning score across all appearances.',
      badge: 'Winner = 100%',
      span: 'single',
      section: 'scoring',
    },
    {
      id: 'normalized-median-score',
      title: 'Normalized Median Score',
      description:
        'Typical share of each game’s winning score, using medians to smooth out spikes.',
      badge: 'Winner = 100%',
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
      span: 'full',
      section: 'scoring',
    },
    {
      id: 'score-distribution-by-player',
      title: 'Score Distribution by Player',
      description: 'Per-player score spread using quartiles, medians, and min/max whiskers.',
      badge: 'Min 5 games',
      span: 'full',
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
      id: 'games-over-time',
      title: 'Games Over Time',
      description:
        'Game frequency plotted across weekly or monthly activity buckets in your local time.',
      badge: undefined,
      span: 'full',
      section: 'activity',
    },
    {
      id: 'cumulative-games',
      title: 'Cumulative Games',
      description:
        'Running total of recorded games over time, bucketed by week or month in your local time.',
      badge: undefined,
      span: 'full',
      section: 'activity',
    },
    {
      id: 'player-attendance-over-time',
      title: 'Player Attendance Over Time',
      description:
        'Stacked appearance totals showing who participated in each activity bucket in your local time.',
      badge: undefined,
      span: 'full',
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
    'total-wins': winRates.length === 0 ? (
      <EmptyState>No wins recorded yet.</EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Wins', align: 'right' },
          { label: 'Win Rate', align: 'right' },
        ]}
      >
        {winRates.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={totalWinsRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="px-3 py-2 text-right text-(--cream) tabular-nums">{player.wins}</td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {formatPercent(player.winRate, 1)}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'win-rate': winRateQualified.length === 0 ? (
      <EmptyState>
        No players have played {settings.winRateMinGames}+ game
        {settings.winRateMinGames === 1 ? '' : 's'} yet.
      </EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Win Rate', align: 'right' },
          { label: 'Wins', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {winRateQualified.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={winRateRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatPercent(player.winRate, 1)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream) tabular-nums">{player.wins}</td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'current-win-streak': currentWinStreaks.length > 0 ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Streak', align: 'right' },
          { label: 'Last Win', align: 'right' },
        ]}
      >
        {currentWinStreaks.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={currentWinStreakRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatWinLabel(player.streak)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70">
              {player.mostRecentWin ? (
                <FormattedDate iso={player.mostRecentWin} className="
                  inline text-(--cream)/70
                " />
              ) : (
                '—'
              )}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    ),
    'total-vp': cumulativeScoreStats.some((player) => player.games > 0) ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Total VP', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {cumulativeScoreStats.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={totalVpRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {player.totalScore}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    ),
    'avg-score': scoreStats.length === 0 ? (
      <EmptyState>No games recorded yet.</EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Avg Score', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {scoreStats.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={avgScoreRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatAverage(player.avgScore)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'median-score': medianSorted.length === 0 ? (
      <EmptyState>No games recorded yet.</EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Median Score', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {medianSorted.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={medianScoreRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatAverage(player.medianScore)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'points-per-game': pointsPerGameSorted.length === 0 ? (
      <EmptyState>No games recorded yet.</EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'PPG', align: 'right' },
          { label: 'Total VP', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {pointsPerGameSorted.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={pointsPerGameRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatAverage(player.pointsPerGame)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
              {player.totalScore}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'winning-vs-losing-score':
      winningScoreComparison.winnerRows + winningScoreComparison.nonWinnerRows === 0 ? (
        <EmptyState>No games recorded yet.</EmptyState>
      ) : (
        <div className="space-y-4">
          <div className="
            grid gap-3
            sm:grid-cols-2
          ">
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
          <div className="
            rounded-xl border border-(--gold)/10 bg-(--navy-900)/35 p-3
          ">
            <p className="text-xs tracking-widest text-(--cream)/50 uppercase">Gap</p>
            <p className="mt-2 font-semibold text-(--gold) tabular-nums">
              {formatSignedNumber(winningScoreComparison.scoreGap)}
            </p>
          </div>
        </div>
      ),
    'normalized-avg-score': normalizedScoreStats.length === 0 ? (
      <EmptyState>No games recorded yet.</EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Normalized Avg', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {normalizedScoreStats.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={normalizedAvgScoreRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatPercent(player.avgScore, 1)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'normalized-median-score': normalizedMedianSorted.length === 0 ? (
      <EmptyState>No games recorded yet.</EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Normalized Median', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {normalizedMedianSorted.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={normalizedMedianScoreRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatPercent(player.medianScore, 1)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'winning-score-by-game-size': <WinningScoreByGameSizeChart buckets={winningScoreByGameSize} />,
    'score-histogram': <ScoreHistogramChart buckets={scoreHistogramBuckets} />,
    'score-distribution-by-player':
      qualifiedScoreDistributions.length > 0 ? (
        <PlayerScoreBoxPlot distributions={qualifiedScoreDistributions} />
      ) : (
        scoreDistributionEmptyState
      ),
    'podium-rate': podiumRateQualified.length === 0 ? (
      podiumRateEmptyState
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Podium Rate', align: 'right' },
          { label: 'Podiums', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {podiumRateQualified.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={podiumRateRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatPercent(player.podiumRate, 1)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
              {player.podiums}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    bridesmaid: bridesmaidSorted.length === 0 ? (
      <EmptyState>No games recorded yet.</EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: '2nd Place', align: 'right' },
          { label: 'Rate', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {bridesmaidSorted.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={bridesmaidRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {player.seconds}
            </td>
            <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
              {formatPercent(player.secondRate, 1)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'expected-vs-actual-wins': expectedVsActualWins.some((player) => player.games > 0) ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Delta', align: 'right' },
          { label: 'Actual Wins', align: 'right' },
          { label: 'Expected Wins', align: 'right' },
        ]}
      >
        {expectedVsActualWins.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={expectedVsActualRanks[index]} />
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
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {formatAverage(player.expectedWins)}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    ),
    'finish-breakdown': finishBreakdowns.length === 0 ? (
      <EmptyState>No games recorded yet.</EmptyState>
    ) : (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: '1st', align: 'right' },
          { label: '2nd', align: 'right' },
          { label: '3rd', align: 'right' },
          { label: 'Last', align: 'right' },
          { label: 'Games', align: 'right' },
        ]}
      >
        {finishBreakdowns.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={finishBreakdownRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
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
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.games}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ),
    'tier-showdown': tierShowdown.some((row) => row.appearances > 0) ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Tier' },
          { label: 'Win Rate', align: 'right' },
          { label: 'Wins', align: 'right' },
          { label: 'Appearances', align: 'right' },
          { label: 'Players', align: 'right' },
        ]}
      >
        {tierShowdown.map((row, index) => (
          <DataRow key={row.tier}>
            <RankCell rank={tierShowdownRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <span className={row.tier === PlayerTier.Premium ? `
                font-semibold text-(--gold)
              ` : ''}>
                {formatTierLabel(row.tier)}
              </span>
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatPercent(row.winRate, 1)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream) tabular-nums">{row.wins}</td>
            <td className="px-3 py-2 text-right text-(--cream) tabular-nums">
              {row.appearances}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {row.players}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
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
      <PlayerAttendanceChart events={playerAttendanceEvents} defaultView="week" />
    ),
    'participation-rate': participationRates.some((player) => player.totalGames > 0) ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Participation', align: 'right' },
          { label: 'Games Played', align: 'right' },
        ]}
      >
        {participationRates.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={participationRateRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatPercent(player.participationRate, 1)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70 tabular-nums">
              {player.gamesPlayed}
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
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
    'average-games-per-session': <AverageGamesPerSessionCard playedAtIsos={gameActivityTimestamps} />,
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
    'single-game-records': <SingleGameRecordsContent records={singleGameRecords} />,
    'longest-win-streak-ever': longestWinStreakRecords.length > 0 ? (
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Record', align: 'right' },
          { label: 'Period', align: 'right' },
        ]}
      >
        {longestWinStreakRecords.map((player, index) => (
          <DataRow key={player.playerId}>
            <RankCell rank={longestWinStreakRanks[index]} />
            <td className="px-3 py-2 text-(--cream)">
              <PlayerName name={player.name} tier={player.tier} />
            </td>
            <td className="
              px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
            ">
              {formatWinLabel(player.longestWinStreak)}
            </td>
            <td className="px-3 py-2 text-right text-(--cream)/70">
              <StreakPeriod
                startedAt={player.longestWinStreakStartedAt}
                endedAt={player.longestWinStreakEndedAt}
              />
            </td>
          </DataRow>
        ))}
      </StatsLeaderboardTable>
    ) : (
      <EmptyState>No games recorded yet.</EmptyState>
    ),
    'longest-gap-between-games': <LongestGapCard playedAtIsos={gameActivityTimestamps} />,
    'busiest-records': <BusiestRecordsCard playedAtIsos={gameActivityTimestamps} />,
  };

  return (
    <>
      <StatsAnchorNav sections={STATS_SECTIONS.map(({ id, title }) => ({ id, title }))} />
      <main className="
        mx-auto max-w-7xl px-4 pb-6
        sm:px-6 sm:pb-8
      ">
        <div className="space-y-12">
          {STATS_SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <StatsSectionHeader title={section.title} subtitle={section.subtitle} />

              <div className="
                grid grid-cols-1 gap-5
                lg:grid-cols-2
              ">
                {cardsBySection[section.id].map((card) => (
                  <StatsCard key={card.id} {...card}>
                    {cardContents[card.id]}
                  </StatsCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
