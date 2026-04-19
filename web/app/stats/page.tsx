import type { Metadata } from 'next'
import { getPlayerWinRates, getPlayerScoreStats, getPlayerPodiumRates } from '@/lib/stats'
import { getSettings } from '@/lib/settings'
import { formatPercent, formatAverage } from '@/lib/format'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Stats — HarborStats' }

export default async function StatsPage() {
  const [winRates, settings, scoreStats, podiumRates] = await Promise.all([
    getPlayerWinRates(),
    getSettings(),
    getPlayerScoreStats(),
    getPlayerPodiumRates(),
  ])

  const winRateQualified = winRates
    .filter((p) => p.games >= settings.winRateMinGames)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 space-y-8">
      <h1 className="font-cinzel text-3xl font-bold text-[var(--gold)] tracking-wide">Stats</h1>

      <section id="total-wins">
        <h2 className="font-cinzel text-xl text-[var(--cream)] mb-3">Total Wins</h2>
        <div className="rounded-lg border border-[var(--gold)]/20 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--gold)]/20 bg-[var(--navy-900)]/80">
                <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase w-10">
                  #
                </th>
                <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                  Player
                </th>
                <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                  Wins
                </th>
                <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                  Win Rate
                </th>
              </tr>
            </thead>
            <tbody>
              {winRates.map((player, idx) => (
                <tr
                  key={player.playerId}
                  className="border-b border-[var(--gold)]/10 last:border-0 bg-[var(--navy-900)]/40 hover:bg-[var(--navy-900)]/70 transition-colors"
                >
                  <td className="px-3 py-2 tabular-nums text-[var(--cream)]/50 text-center">
                    {idx === 0 ? '👑' : idx + 1}
                  </td>
                  <td className="px-3 py-2 text-[var(--cream)]">
                    <span className={player.tier === 'premium' ? 'text-[var(--gold)] font-semibold' : ''}>
                      {player.name}
                    </span>
                    {player.tier === 'premium' && (
                      <span className="ml-2 rounded px-1 py-0.5 text-xs font-cinzel tracking-widest bg-[var(--gold)]/15 text-[var(--gold)] uppercase">
                        Pro
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-right text-[var(--cream)]">
                    {player.wins}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-right text-[var(--cream)]/70">
                    {formatPercent(player.winRate, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="win-rate">
        <h2 className="font-cinzel text-xl text-[var(--cream)] mb-1">Win Rate</h2>
        {settings.winRateMinGames > 0 && (
          <p className="text-xs text-[var(--cream)]/50 mb-3">
            Min {settings.winRateMinGames} game{settings.winRateMinGames === 1 ? '' : 's'}
          </p>
        )}
        {!settings.winRateMinGames && <div className="mb-3" />}
        {winRateQualified.length === 0 ? (
          <p className="text-sm text-[var(--cream)]/50 py-6 text-center">
            No players have played {settings.winRateMinGames}+ game
            {settings.winRateMinGames === 1 ? '' : 's'} yet.
          </p>
        ) : (
          <div className="rounded-lg border border-[var(--gold)]/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gold)]/20 bg-[var(--navy-900)]/80">
                  <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Player
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Win Rate
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Wins
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Games
                  </th>
                </tr>
              </thead>
              <tbody>
                {winRateQualified.map((player, idx) => (
                  <tr
                    key={player.playerId}
                    className="border-b border-[var(--gold)]/10 last:border-0 bg-[var(--navy-900)]/40 hover:bg-[var(--navy-900)]/70 transition-colors"
                  >
                    <td className="px-3 py-2 tabular-nums text-[var(--cream)]/50 text-center">
                      {idx === 0 ? '👑' : idx + 1}
                    </td>
                    <td className="px-3 py-2 text-[var(--cream)]">
                      <span className={player.tier === 'premium' ? 'text-[var(--gold)] font-semibold' : ''}>
                        {player.name}
                      </span>
                      {player.tier === 'premium' && (
                        <span className="ml-2 rounded px-1 py-0.5 text-xs font-cinzel tracking-widest bg-[var(--gold)]/15 text-[var(--gold)] uppercase">
                          Pro
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[var(--gold)] font-semibold">
                      {formatPercent(player.winRate, 1)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[var(--cream)]">
                      {player.wins}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[var(--cream)]/70">
                      {player.games}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="avg-score">
        <h2 className="font-cinzel text-xl text-[var(--cream)] mb-3">Average Score</h2>
        {scoreStats.length === 0 ? (
          <p className="text-sm text-[var(--cream)]/50 py-6 text-center">No games recorded yet.</p>
        ) : (
          <div className="rounded-lg border border-[var(--gold)]/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gold)]/20 bg-[var(--navy-900)]/80">
                  <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Player
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Avg Score
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Games
                  </th>
                </tr>
              </thead>
              <tbody>
                {scoreStats.map((player, idx) => (
                  <tr
                    key={player.playerId}
                    className="border-b border-[var(--gold)]/10 last:border-0 bg-[var(--navy-900)]/40 hover:bg-[var(--navy-900)]/70 transition-colors"
                  >
                    <td className="px-3 py-2 tabular-nums text-[var(--cream)]/50 text-center">
                      {idx === 0 ? '👑' : idx + 1}
                    </td>
                    <td className="px-3 py-2 text-[var(--cream)]">
                      <span
                        className={player.tier === 'premium' ? 'text-[var(--gold)] font-semibold' : ''}
                      >
                        {player.name}
                      </span>
                      {player.tier === 'premium' && (
                        <span className="ml-2 rounded px-1 py-0.5 text-xs font-cinzel tracking-widest bg-[var(--gold)]/15 text-[var(--gold)] uppercase">
                          Pro
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[var(--gold)] font-semibold">
                      {formatAverage(player.avgScore)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[var(--cream)]/70">
                      {player.games}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="median-score">
        <h2 className="font-cinzel text-xl text-[var(--cream)] mb-3">Median Score</h2>
        {scoreStats.length === 0 ? (
          <p className="text-sm text-[var(--cream)]/50 py-6 text-center">No games recorded yet.</p>
        ) : (
          <div className="rounded-lg border border-[var(--gold)]/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gold)]/20 bg-[var(--navy-900)]/80">
                  <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Player
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Median Score
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Games
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...scoreStats]
                  .sort((a, b) => b.medianScore - a.medianScore)
                  .map((player, idx) => (
                    <tr
                      key={player.playerId}
                      className="border-b border-[var(--gold)]/10 last:border-0 bg-[var(--navy-900)]/40 hover:bg-[var(--navy-900)]/70 transition-colors"
                    >
                      <td className="px-3 py-2 tabular-nums text-[var(--cream)]/50 text-center">
                        {idx === 0 ? '👑' : idx + 1}
                      </td>
                      <td className="px-3 py-2 text-[var(--cream)]">
                        <span
                          className={
                            player.tier === 'premium' ? 'text-[var(--gold)] font-semibold' : ''
                          }
                        >
                          {player.name}
                        </span>
                        {player.tier === 'premium' && (
                          <span className="ml-2 rounded px-1 py-0.5 text-xs font-cinzel tracking-widest bg-[var(--gold)]/15 text-[var(--gold)] uppercase">
                            Pro
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-right text-[var(--gold)] font-semibold">
                        {formatAverage(player.medianScore)}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-right text-[var(--cream)]/70">
                        {player.games}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="podium-rate">
        <h2 className="font-cinzel text-xl text-[var(--cream)] mb-3">Podium Rate</h2>
        {podiumRates.length === 0 ? (
          <p className="text-sm text-[var(--cream)]/50 py-6 text-center">No games recorded yet.</p>
        ) : (
          <div className="rounded-lg border border-[var(--gold)]/20 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--gold)]/20 bg-[var(--navy-900)]/80">
                  <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase w-10">
                    #
                  </th>
                  <th className="px-3 py-2 text-left font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Player
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Podium Rate
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Podiums
                  </th>
                  <th className="px-3 py-2 text-right font-cinzel text-xs tracking-widest text-[var(--cream)]/50 uppercase">
                    Games
                  </th>
                </tr>
              </thead>
              <tbody>
                {podiumRates.map((player, idx) => (
                  <tr
                    key={player.playerId}
                    className="border-b border-[var(--gold)]/10 last:border-0 bg-[var(--navy-900)]/40 hover:bg-[var(--navy-900)]/70 transition-colors"
                  >
                    <td className="px-3 py-2 tabular-nums text-[var(--cream)]/50 text-center">
                      {idx === 0 ? '👑' : idx + 1}
                    </td>
                    <td className="px-3 py-2 text-[var(--cream)]">
                      <span
                        className={player.tier === 'premium' ? 'text-[var(--gold)] font-semibold' : ''}
                      >
                        {player.name}
                      </span>
                      {player.tier === 'premium' && (
                        <span className="ml-2 rounded px-1 py-0.5 text-xs font-cinzel tracking-widest bg-[var(--gold)]/15 text-[var(--gold)] uppercase">
                          Pro
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[var(--gold)] font-semibold">
                      {formatPercent(player.podiumRate, 1)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[var(--cream)]">
                      {player.podiums}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-right text-[var(--cream)]/70">
                      {player.games}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}
