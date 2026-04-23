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
import { LongestGapCard } from '@/components/LongestGapCard';
import { PlayerAttendanceChart } from '@/components/PlayerAttendanceChart';
import { StatsCard } from '@/components/StatsCard';
import { StatsLeaderboardTable } from '@/components/StatsLeaderboardTable';
import { formatAverage, formatPercent, formatSignedNumber } from '@/lib/format';
import { PlayerTier } from '@/lib/player-tier';
import { rankWithTies } from '@/lib/rank';
import { getSettings } from '@/lib/settings';
import {
  getGameActivityTimestamps,
  getPlayerAttendanceEvents,
  getPlayerCurrentWinStreaks,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerNormalizedScoreStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerWinEvents,
  getSingleGameRecords,
  getTierShowdownStats,
  getPlayerWinRates,
  type SingleGameRecords,
} from '@/lib/stats';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Stats — HarborStats' };

interface StatsCardMeta {
  id: string;
  title: string;
  description: string;
  badge: string | undefined;
  span: 'single' | 'full';
}

function PlayerName({ name, tier }: { name: string; tier: PlayerTier }) {
  return (
    <div className="min-w-0">
      <span
        className={
          tier === PlayerTier.Premium
            ? `font-semibold text-(--gold)`
            : ''
        }
      >
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

function formatTierLabel(tier: PlayerTier) {
  return tier === PlayerTier.Premium ? 'Premium' : 'Standard';
}

function formatWinLabel(count: number) {
  return `${count} win${count === 1 ? '' : 's'}`
}

function formatPointLabel(count: number) {
  return `${count} point${count === 1 ? '' : 's'}`;
}

function formatMarginLabel(count: number) {
  return `${count}-point margin`;
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
      <FormattedDate
        iso={playedAt}
        className="mt-2 block text-xs text-(--cream)/50"
      />
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
    singleGameRecords,
  ] = await Promise.all([
    getPlayerWinRates(),
    getSettings(),
    getPlayerScoreStats(),
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
    getSingleGameRecords(),
  ]);

  const winRateQualified = winRates
    .filter((player) => player.games >= settings.winRateMinGames)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins);
  const podiumRateQualified = podiumRates
    .filter((player) => player.games >= settings.podiumRateMinGames)
    .sort((a, b) => b.podiumRate - a.podiumRate || b.podiums - a.podiums);

  const medianSorted = [...scoreStats].sort((a, b) => b.medianScore - a.medianScore);
  const normalizedMedianSorted = [...normalizedScoreStats].sort(
    (a, b) => b.medianScore - a.medianScore,
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

  const totalWinsRanks = rankWithTies(winRates, (player) => player.wins);
  const winRateRanks = rankWithTies(winRateQualified, (player) => player.winRate);
  const avgScoreRanks = rankWithTies(scoreStats, (player) => player.avgScore);
  const medianScoreRanks = rankWithTies(medianSorted, (player) => player.medianScore);
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

  const statsCards: StatsCardMeta[] = [
    {
      id: 'total-wins',
      title: 'Total Wins',
      description: 'All-time victory leaderboard with win rate alongside total finishes.',
      badge: undefined,
      span: 'single',
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
    },
    {
      id: 'avg-score',
      title: 'Average Score',
      description: 'Scoring leaderboard ranked by each player’s all-time average.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'median-score',
      title: 'Median Score',
      description: 'Typical scoring performance with median values to smooth out spikes.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'normalized-avg-score',
      title: 'Normalized Average Score',
      description: 'Average share of each game’s winning score across all appearances.',
      badge: 'Winner = 100%',
      span: 'single',
    },
    {
      id: 'normalized-median-score',
      title: 'Normalized Median Score',
      description: 'Typical share of each game’s winning score, using medians to smooth out spikes.',
      badge: 'Winner = 100%',
      span: 'single',
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
    },
    {
      id: 'expected-vs-actual-wins',
      title: 'Expected vs Actual Wins',
      description: 'Actual wins versus the baseline 1/N expectation for each game played.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'tier-showdown',
      title: 'Tier Showdown',
      description: 'Premium and standard tier players compared by wins per appearance.',
      badge: undefined,
      span: 'full',
    },
    {
      id: 'finish-breakdown',
      title: 'Finish Breakdown',
      description: 'Share of games each player finished first, second, third, or last.',
      badge: undefined,
      span: 'full',
    },
    {
      id: 'games-over-time',
      title: 'Games Over Time',
      description: 'Game frequency plotted across weekly or monthly activity buckets in your local time.',
      badge: undefined,
      span: 'full',
    },
    {
      id: 'participation-rate',
      title: 'Participation Rate',
      description: 'Share of all recorded games each player has appeared in.',
      badge: undefined,
      span: 'full',
    },
    {
      id: 'player-attendance-over-time',
      title: 'Player Attendance Over Time',
      description: 'Stacked appearance totals showing who participated in each activity bucket in your local time.',
      badge: undefined,
      span: 'full',
    },
    {
      id: 'cumulative-games',
      title: 'Cumulative Games',
      description: 'Running total of recorded games over time, bucketed by week or month in your local time.',
      badge: undefined,
      span: 'full',
    },
    {
      id: 'calendar-heatmap',
      title: 'Calendar Heatmap',
      description: 'Daily game frequency across the last 12 months or any recorded year in your local time.',
      badge: undefined,
      span: 'full',
    },
    {
      id: 'day-of-week-pattern',
      title: 'Day-of-Week Pattern',
      description: 'How many games were played on each weekday in your local time.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'time-of-day-pattern',
      title: 'Time-of-Day Pattern',
      description: 'Local start-time distribution bucketed by hour of day.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'average-games-per-session',
      title: 'Average Games per Session',
      description: 'Mean games per local-calendar-day session.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'longest-gap-between-games',
      title: 'Longest Gap Between Games',
      description: 'Longest stretch of idle local calendar days between consecutive games.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'busiest-records',
      title: 'Busiest Day / Week / Month Records',
      description: 'Most active local day, ISO week, and month by total games played.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'current-win-streak',
      title: 'Current Win Streak',
      description: 'Active streak leaderboard based on each player’s own appearance history.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'most-wins-in-week',
      title: 'Most Wins in a Week',
      description: 'Each player’s personal-best win total in a local calendar week.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'most-wins-in-month',
      title: 'Most Wins in a Month',
      description: 'Each player’s personal-best win total in a local calendar month.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'single-game-records',
      title: 'Single-Game Records',
      description: 'Peak scores, squeaky wins, blowouts, and nail-biters from recorded games.',
      badge: undefined,
      span: 'single',
    },
  ];

  const cardById = Object.fromEntries(statsCards.map((card) => [card.id, card])) as Record<
    string,
    StatsCardMeta
  >;

  return (
    <main
      className="
        mx-auto max-w-7xl px-4 py-6
        sm:px-6 sm:py-8
      "
    >
      <div
        className="
          grid grid-cols-1 gap-5
          lg:grid-cols-2
        "
      >
        <StatsCard {...cardById['total-wins']}>
          {winRates.length === 0 ? (
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
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {player.wins}
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    "
                  >
                    {formatPercent(player.winRate, 1)}
                  </td>
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          )}
        </StatsCard>

        <StatsCard {...cardById['win-rate']}>
          {winRateQualified.length === 0 ? (
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
                  <td
                    className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    "
                  >
                    {formatPercent(player.winRate, 1)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {player.wins}
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    "
                  >
                    {player.games}
                  </td>
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          )}
        </StatsCard>

        <StatsCard {...cardById['avg-score']}>
          {scoreStats.length === 0 ? (
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
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    "
                  >
                    {player.games}
                  </td>
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          )}
        </StatsCard>

        <StatsCard {...cardById['median-score']}>
          {medianSorted.length === 0 ? (
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
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          )}
        </StatsCard>

        <StatsCard {...cardById['normalized-avg-score']}>
          {normalizedScoreStats.length === 0 ? (
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
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          )}
        </StatsCard>

        <StatsCard {...cardById['normalized-median-score']}>
          {normalizedMedianSorted.length === 0 ? (
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
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          )}
        </StatsCard>

        <StatsCard {...cardById['podium-rate']}>
          {podiumRateQualified.length === 0 ? (
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
                  <td
                    className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    "
                  >
                    {formatPercent(player.podiumRate, 1)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {player.podiums}
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    "
                  >
                    {player.games}
                  </td>
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          )}
        </StatsCard>

        <StatsCard {...cardById['expected-vs-actual-wins']}>
          {expectedVsActualWins.some((player) => player.games > 0) ? (
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
                      ${
                        player.winDelta >= 0
                          ? 'text-(--gold)'
                          : `text-(--cream)`
                      }
                    `}
                  >
                    {formatSignedNumber(player.winDelta)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {player.wins}
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    "
                  >
                    {formatAverage(player.expectedWins)}
                  </td>
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          ) : (
            <EmptyState>No games recorded yet.</EmptyState>
          )}
        </StatsCard>

        <StatsCard {...cardById['tier-showdown']}>
          {tierShowdown.some((row) => row.appearances > 0) ? (
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
                    <span
                      className={
                        row.tier === PlayerTier.Premium
                          ? `font-semibold text-(--gold)`
                          : ''
                      }
                    >
                      {formatTierLabel(row.tier)}
                    </span>
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    "
                  >
                    {formatPercent(row.winRate, 1)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {row.wins}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {row.appearances}
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    "
                  >
                    {row.players}
                  </td>
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          ) : (
            <EmptyState>No games recorded yet.</EmptyState>
          )}
        </StatsCard>

        <StatsCard {...cardById['finish-breakdown']}>
          {finishBreakdowns.length === 0 ? (
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
                  <td
                    className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    "
                  >
                    {formatPercent(player.firstRate, 1)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {formatPercent(player.secondRate, 1)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {formatPercent(player.thirdRate, 1)}
                  </td>
                  <td
                    className="px-3 py-2 text-right text-(--cream) tabular-nums"
                  >
                    {formatPercent(player.lastRate, 1)}
                  </td>
                  <td
                    className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    "
                  >
                    {player.games}
                  </td>
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          )}
        </StatsCard>

        <StatsCard {...cardById['games-over-time']}>
          <GamesOverTimeChart playedAtIsos={gameActivityTimestamps} defaultView="week" />
        </StatsCard>

        <StatsCard {...cardById['participation-rate']}>
          {participationRates.some((player) => player.totalGames > 0) ? (
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
                  <td
                    className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
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
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          ) : (
            <EmptyState>No games recorded yet.</EmptyState>
          )}
        </StatsCard>

        <StatsCard {...cardById['player-attendance-over-time']}>
          <PlayerAttendanceChart events={playerAttendanceEvents} defaultView="week" />
        </StatsCard>

        <StatsCard {...cardById['cumulative-games']}>
          <CumulativeGamesAreaChart playedAtIsos={gameActivityTimestamps} defaultView="month" />
        </StatsCard>

        <StatsCard {...cardById['calendar-heatmap']}>
          <CalendarHeatmap playedAtIsos={gameActivityTimestamps} defaultSelection="recent" />
        </StatsCard>

        <StatsCard {...cardById['day-of-week-pattern']}>
          <ActivityDistributionChart playedAtIsos={gameActivityTimestamps} variant="weekday" />
        </StatsCard>

        <StatsCard {...cardById['time-of-day-pattern']}>
          <ActivityDistributionChart playedAtIsos={gameActivityTimestamps} variant="hour" />
        </StatsCard>

        <StatsCard {...cardById['average-games-per-session']}>
          <AverageGamesPerSessionCard playedAtIsos={gameActivityTimestamps} />
        </StatsCard>

        <StatsCard {...cardById['longest-gap-between-games']}>
          <LongestGapCard playedAtIsos={gameActivityTimestamps} />
        </StatsCard>

        <StatsCard {...cardById['busiest-records']}>
          <BusiestRecordsCard playedAtIsos={gameActivityTimestamps} />
        </StatsCard>

        <StatsCard {...cardById['current-win-streak']}>
          {currentWinStreaks.length > 0 ? (
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
                </DataRow>
              ))}
            </StatsLeaderboardTable>
          ) : (
            <EmptyState>No games recorded yet.</EmptyState>
          )}
        </StatsCard>

        <StatsCard {...cardById['most-wins-in-week']}>
          <BestWinRecordsLeaderboard
            players={currentWinStreaks}
            winEvents={playerWinEvents}
            variant="week"
          />
        </StatsCard>

        <StatsCard {...cardById['most-wins-in-month']}>
          <BestWinRecordsLeaderboard
            players={currentWinStreaks}
            winEvents={playerWinEvents}
            variant="month"
          />
        </StatsCard>

        <StatsCard {...cardById['single-game-records']}>
          <SingleGameRecordsContent records={singleGameRecords} />
        </StatsCard>
      </div>
    </main>
  );
}
