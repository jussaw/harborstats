import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FormattedDate } from '@/components/FormattedDate';
import { PageWidth } from '@/components/PageWidth';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getGameRecap } from '@/lib/games';
import { getRatingReplay } from '@/lib/ratings';
import { formatRatingChange, getGameRatingImpacts } from '@/lib/recap-rating';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

function parseRouteId(id: string) {
  if (!/^[1-9]\d*$/.test(id)) {
    notFound();
  }

  return Number(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const recap = await getGameRecap(parseRouteId(id));
  if (!recap) {
    return { title: 'Game — HarborStats' };
  }
  const winner = recap.players.find((player) => player.isWinner);
  return {
    title: winner ? `${winner.playerName} wins — HarborStats` : 'Game Recap — HarborStats',
  };
}

export default async function GameRecapPage({ params }: Props) {
  const { id } = await params;
  const numericId = parseRouteId(id);

  const [recap, ratingReplay] = await Promise.all([
    getGameRecap(numericId),
    getRatingReplay(),
  ]);
  if (!recap) notFound();

  const impacts = getGameRatingImpacts(ratingReplay, recap.id);
  const winner = recap.players.find((player) => player.isWinner) ?? null;
  const heading = winner ? `${winner.playerName} wins` : 'No winner recorded';
  const anyRated = recap.players.some((player) => impacts.has(player.playerId));

  return (
    <PageWidth width="2xl" className="px-4 py-12">
      <div className="space-y-6">
        <Link
          href="/games"
          className="
            inline-flex items-center gap-2 rounded-lg border
            border-(--border-gold) px-3 py-2 text-xs text-(--cream)/70
            transition-colors
            hover:border-(--gold) hover:text-(--gold)
          "
        >
          <ArrowLeft className="size-4" />
          <span>Back to games</span>
        </Link>

        <header className="space-y-1">
          <h1 className="font-cinzel text-3xl tracking-wide text-(--cream)">{heading}</h1>
          <FormattedDate
            iso={recap.playedAt.toISOString()}
            dateOnly
            className="block text-sm text-(--cream)/55"
          />
        </header>

        <Card
          title="Scoreboard"
          description={anyRated ? 'Elo shown as of this game.' : undefined}
        >
          <ol className="space-y-1.5">
            {recap.players.map((player) => {
              const impact = impacts.get(player.playerId);
              return (
                <li
                  key={player.playerId}
                  className={`
                    flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg p-2
                    text-sm
                    ${
                      player.isWinner
                        ? 'bg-(--gold)/10 font-semibold text-(--gold)'
                        : 'text-(--cream)/80'
                    }
                  `}
                >
                  <span aria-hidden="true" className="
                    w-4 text-center leading-none
                  ">
                    {player.isWinner ? '♛' : ''}
                  </span>
                  <Link
                    href={`/players/${player.playerId}`}
                    className="
                      underline-offset-2
                      hover:underline
                    "
                  >
                    {player.playerName}
                    {player.isWinner && <span className="sr-only"> (winner)</span>}
                  </Link>
                  <span className="ml-auto tabular-nums">{player.score}</span>
                  <span
                    className="
                      flex w-full items-center justify-end gap-2 text-xs
                      sm:w-auto sm:min-w-40
                    "
                  >
                    {impact ? (
                      <>
                        <span className="text-(--cream)/70 tabular-nums">
                          {Math.round(impact.ratingAfter)} Elo
                        </span>
                        <span className="text-(--cream)/55 tabular-nums">
                          {formatRatingChange(impact.change)}
                        </span>
                      </>
                    ) : (
                      <Badge>Unrated</Badge>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </Card>

        {recap.notes && (
          <Card title="Notes">
            <p className="text-sm text-(--cream)/70 italic">{recap.notes}</p>
          </Card>
        )}
      </div>
    </PageWidth>
  );
}
