'use client';

import { useState } from 'react';
import { PlayerTier } from '@/lib/player-tier';
import type { PlayerHeadToHeadRecord, PlayerIdentity } from '@/lib/stats';

type TierView = 'premium' | 'all';

interface Props {
  records: PlayerHeadToHeadRecord[];
  players: PlayerIdentity[];
}

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
};

function getPlayerNameClass(tier: PlayerIdentity['tier']) {
  if (tier === PlayerTier.Premium) {
    return 'font-semibold text-(--gold)';
  }

  return 'text-(--cream)';
}

function formatCellKey(playerId: number, opponentId: number) {
  return `${playerId}:${opponentId}`;
}

function buildRecordMap(records: PlayerHeadToHeadRecord[]) {
  return new Map(
    records.map((record) => [formatCellKey(record.playerId, record.opponentId), record]),
  );
}

function renderCellContent(record: PlayerHeadToHeadRecord | null) {
  if (!record || record.gamesTogether === 0) {
    return (
      <div className="text-(--cream)/35">
        <p className="font-semibold tabular-nums">0-0</p>
        <p className="mt-1 text-xs">Outscored: 0/0</p>
      </div>
    );
  }

  return (
    <div className="text-(--cream)">
      <p className="font-semibold tabular-nums">
        {record.winsAgainstOpponent}-{record.lossesToOpponent}
      </p>
      <p className="mt-1 text-xs text-(--cream)/55">
        Outscored: {record.timesOutscoredOpponent}/{record.gamesTogether}
      </p>
    </div>
  );
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`
        rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase
        transition-colors
        ${
          active
            ? 'bg-(--gold) text-(--navy-900)'
            : `
              text-(--cream)/60
              hover:text-(--cream)
            `
        }
      `}
    >
      {label}
    </button>
  );
}

export function HeadToHeadMatrix({ records, players }: Props) {
  const [view, setView] = useState<TierView>('premium');
  const visiblePlayers =
    view === 'premium' ? players.filter((player) => player.tier === PlayerTier.Premium) : players;
  const recordMap = buildRecordMap(records);

  return (
    <div>
      <div
        className="
          mb-3 inline-flex items-center gap-1 rounded-full border
          border-(--gold)/15 bg-(--navy-900)/50 p-1
        "
      >
        <ToggleButton
          active={view === 'premium'}
          label="Premium"
          onClick={() => setView('premium')}
        />
        <ToggleButton active={view === 'all'} label="All Players" onClick={() => setView('all')} />
      </div>
      {visiblePlayers.length === 0 ? (
        <p className="py-8 text-center text-sm text-(--cream)/50">
          No premium players recorded yet.
        </p>
      ) : (
        <div
          className="
            overflow-x-auto rounded-2xl border border-(--gold)/15
            bg-(--navy-800)/30
          "
        >
          <table
            aria-label="Head-to-head matrix"
            className="min-w-max border-separate border-spacing-0 text-sm"
          >
            <thead>
              <tr className="bg-(--navy-900)/80">
                <th
                  scope="col"
                  className="
                    sticky left-0 z-20 border-r border-b border-(--gold)/15
                    bg-(--navy-900) px-4 py-3 text-left text-xs
                    tracking-[0.25em] text-(--cream)/45 uppercase
                  "
                  style={cinzelStyle}
                >
                  Player
                </th>
                {visiblePlayers.map((player) => (
                  <th
                    key={player.playerId}
                    scope="col"
                    className="
                      min-w-32 border-b border-(--gold)/15 px-4 py-3 text-center
                    "
                  >
                    <span
                      style={cinzelStyle}
                      className={`
                        block tracking-widest uppercase
                        ${getPlayerNameClass(player.tier)}
                      `}
                    >
                      {player.name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visiblePlayers.map((player) => (
                <tr key={player.playerId} className="bg-(--navy-900)/25">
                  <th
                    scope="row"
                    className="
                      sticky left-0 z-10 border-r border-b border-(--gold)/10
                      bg-(--navy-900) px-4 py-3 text-left
                    "
                  >
                    <span
                      style={cinzelStyle}
                      className={`
                        block tracking-widest uppercase
                        ${getPlayerNameClass(player.tier)}
                      `}
                    >
                      {player.name}
                    </span>
                  </th>
                  {visiblePlayers.map((opponent) => {
                    const isDiagonal = player.playerId === opponent.playerId;
                    const record =
                      recordMap.get(formatCellKey(player.playerId, opponent.playerId)) ?? null;

                    return (
                      <td
                        key={opponent.playerId}
                        data-testid={`head-to-head-cell-${player.playerId}-${opponent.playerId}`}
                        className="
                          border-b border-(--gold)/10 px-4 py-3 text-center
                          align-middle
                        "
                      >
                        {isDiagonal ? (
                          <span className="text-(--cream)/30">—</span>
                        ) : (
                          renderCellContent(record)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
