import { PlayerTier } from '@/lib/player-tier';
import type { PlayerHeadToHeadRecord, PlayerIdentity } from '@/lib/stats';

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
  return new Map(records.map((record) => [formatCellKey(record.playerId, record.opponentId), record]));
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

export function HeadToHeadMatrix({ records, players }: Props) {
  const recordMap = buildRecordMap(records);

  return (
    <div
      className="
        overflow-x-auto rounded-2xl border border-(--gold)/15 bg-(--navy-800)/30
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
                bg-(--navy-900) px-4 py-3 text-left text-xs tracking-[0.25em]
                text-(--cream)/45 uppercase
              "
              style={cinzelStyle}
            >
              Player
            </th>
            {players.map((player) => (
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
          {players.map((player) => (
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
              {players.map((opponent) => {
                const isDiagonal = player.playerId === opponent.playerId;
                const record = recordMap.get(formatCellKey(player.playerId, opponent.playerId)) ?? null;

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
  );
}
