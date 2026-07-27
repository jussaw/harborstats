import { Lock, Trophy as TrophyIcon } from 'lucide-react';
import {
  TROPHY_CATEGORY_LABELS,
  TROPHY_CATEGORY_ORDER,
  type Trophy,
  type TrophyCabinet as TrophyCabinetData,
} from '@/lib/trophies';
import { Card } from './ui/Card';

interface Props {
  cabinet: TrophyCabinetData;
}

function TrophyTile({ trophy }: { trophy: Trophy }) {
  const { earned } = trophy;
  const Icon = earned ? TrophyIcon : Lock;

  return (
    <li
      className={`
        flex gap-3 rounded-xl border p-3
        ${
          earned
            ? `border-(--gold)/45 bg-(--gold)/10`
            : `border-(--border-gold-subtle) bg-(--surface-subtle)`
        }
      `}
    >
      <span
        aria-hidden="true"
        className={`
          mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full
          ${earned ? `bg-(--gold)/15 text-(--gold)` : `
            bg-(--navy-900)/40 text-(--cream)/35
          `}
        `}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className={`
              text-sm font-semibold tracking-wide
              ${earned ? `text-(--cream)` : `text-(--cream)/60`}
            `}
          >
            {trophy.name}
          </p>
          <span
            className={`
              rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[0.2em]
              uppercase
              ${
                earned
                  ? `bg-(--gold)/15 text-(--gold)`
                  : `bg-(--navy-900)/40 text-(--cream)/40`
              }
            `}
          >
            {earned ? 'Earned' : 'Locked'}
          </span>
        </div>
        <p className={`
          text-xs
          ${earned ? `text-(--cream)/70` : `text-(--cream)/45`}
        `}>
          {trophy.detail}
        </p>
        <p className="text-[11px] text-(--cream)/40">{trophy.requirement}</p>
      </div>
    </li>
  );
}

export function TrophyCabinet({ cabinet }: Props) {
  const { trophies, earnedCount, totalCount } = cabinet;

  return (
    <section id="player-trophy-cabinet">
      <Card
        title="Trophy Cabinet"
        description="Achievements derived from this player’s recorded game history. Every badge is explainable from stats shown elsewhere on this profile."
        badge={`${earnedCount} / ${totalCount} earned`}
      >
        <div className="space-y-6">
          {TROPHY_CATEGORY_ORDER.map((category) => {
            const categoryTrophies = trophies.filter((trophy) => trophy.category === category);
            if (categoryTrophies.length === 0) {
              return null;
            }

            const categoryEarned = categoryTrophies.filter((trophy) => trophy.earned).length;

            return (
              <div key={category}>
                <h3
                  className="
                    text-[11px] font-medium tracking-[0.25em] text-(--cream)/45
                    uppercase
                  "
                >
                  {TROPHY_CATEGORY_LABELS[category]}
                  <span className="
                    ml-2 tracking-normal text-(--cream)/30 normal-case
                  ">
                    {categoryEarned}/{categoryTrophies.length}
                  </span>
                </h3>
                <ul
                  className="
                    mt-3 grid grid-cols-1 gap-3
                    sm:grid-cols-2
                  "
                >
                  {categoryTrophies.map((trophy) => (
                    <TrophyTile key={trophy.id} trophy={trophy} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
