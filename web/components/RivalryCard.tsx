import Link from 'next/link';
import type { RivalryAggregate } from '@/lib/stats';
import { StatsCardDetailSlot } from '@/components/StatsCard';
import { PlayerTier } from '@/lib/player-tier';

interface RivalryCardProps {
  title: string;
  description: string;
  badge?: string;
  pair: RivalryAggregate | null;
  emptyMessage: string;
}

function formatTierLabel(tier: RivalryAggregate['playerA']['tier']) {
  return tier === PlayerTier.Premium ? 'Premium' : 'Standard';
}

function getPlayerAccentClass(tier: RivalryAggregate['playerA']['tier']) {
  return tier === PlayerTier.Premium ? 'text-(--gold)' : 'text-(--cream)';
}

function RivalryPairContent({ pair }: { pair: RivalryAggregate }) {
  return (
    <div className="flex h-full flex-col justify-between gap-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href={`/players/${pair.playerA.playerId}`}
            className={`
              font-cinzel text-3xl leading-none font-semibold tracking-wide
              ${getPlayerAccentClass(pair.playerA.tier)}
            `}
          >
            {pair.playerA.name}
          </Link>
          <span className="text-(--cream)/35">vs</span>
          <Link
            href={`/players/${pair.playerB.playerId}`}
            className={`
              font-cinzel text-3xl leading-none font-semibold tracking-wide
              ${getPlayerAccentClass(pair.playerB.tier)}
            `}
          >
            {pair.playerB.name}
          </Link>
        </div>

        <div className="space-y-1">
          <p className="text-base font-semibold text-(--cream)">
            {pair.playerAWins} wins - {pair.playerBWins} losses
          </p>
          <p className="text-sm text-(--cream)/60">{pair.gamesTogether} games together</p>
        </div>
      </div>

      <p className="
        text-xs font-semibold tracking-[0.2em] text-(--cream)/45 uppercase
      ">
        {formatTierLabel(pair.playerA.tier)} vs {formatTierLabel(pair.playerB.tier)}
      </p>
    </div>
  );
}

export function RivalryCard({ title, description, badge, pair, emptyMessage }: RivalryCardProps) {
  return (
    <StatsCardDetailSlot size="roomy">
      {(title || description || badge) && (
        <div aria-hidden="true" className="sr-only">
          {[title, description, badge].filter(Boolean).join(' ')}
        </div>
      )}
      {pair ? (
        <RivalryPairContent pair={pair} />
      ) : (
        <p className="py-8 text-center text-sm text-(--cream)/50">{emptyMessage}</p>
      )}
    </StatsCardDetailSlot>
  );
}

RivalryCard.defaultProps = {
  badge: undefined,
};
