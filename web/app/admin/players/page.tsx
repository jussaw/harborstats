import { listPlayersWithUsage } from '@/lib/players'
import { PLAYER_TIER_OPTIONS } from '@/lib/player-tier'
import { ConfirmDeleteButton } from '@/app/admin/ConfirmDeleteButton'
import { createPlayerAction, updatePlayerAction, deletePlayerAction } from './actions'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: Promise<{ error?: string; count?: string }>
}

export default async function AdminPlayersPage({ searchParams }: Props) {
  const [players, params] = await Promise.all([listPlayersWithUsage(), searchParams])
  const { error, count: inUseCount } = params

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="max-w-3xl space-y-8">
        <div>
          <h1 className="font-cinzel text-xl tracking-wide text-(--gold)">Players</h1>
          <p className="mt-0.5 text-xs text-(--cream)/50">{players.length} on roster</p>
        </div>

        {error === 'player-in-use' && (
          <p className="
            rounded-sm border border-amber-500/40 bg-amber-950/40 px-4 py-2.5
            text-sm text-amber-300
          ">
            Cannot delete — this player appears in {inUseCount} game
            {inUseCount === '1' ? '' : 's'}. Remove those games first.
          </p>
        )}
        {error === 'name-required' && (
          <p className="
            rounded-sm border border-red-500/40 bg-red-950/40 px-4 py-2.5
            text-sm text-red-300
          ">
            Player name is required.
          </p>
        )}

        {/* Add new player */}
        <div
          className="rounded-lg border p-5"
          style={{
            borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)',
            background: 'color-mix(in srgb, var(--navy-900) 80%, black)',
          }}
        >
          <p className="
            font-cinzel mb-4 text-xs tracking-widest text-(--gold) uppercase
          ">
            Add Player
          </p>
          <form action={createPlayerAction} className="
            flex flex-wrap items-end gap-3
          ">
            <div className="flex min-w-40 flex-1 flex-col gap-1.5">
              <label className="flex flex-col gap-1.5 text-xs text-(--cream)/50" htmlFor="new-name">
                <span>Name</span>
                <input
                  id="new-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Player name"
                  className="
                    rounded-sm border border-(--gold)/40 bg-(--navy-900) px-3
                    py-2 text-sm text-(--cream) transition-colors
                    placeholder:text-(--cream)/30
                    focus:border-(--gold) focus:outline-none
                  "
                />
              </label>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="flex flex-col gap-1.5 text-xs text-(--cream)/50" htmlFor="new-tier">
                <span>Tier</span>
                <select
                  id="new-tier"
                  name="tier"
                  className="
                    rounded-sm border border-(--gold)/40 bg-(--navy-900) px-3
                    py-2 text-sm text-(--cream) transition-colors
                    focus:border-(--gold) focus:outline-none
                  "
                >
                  {PLAYER_TIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              className="
                font-cinzel rounded-sm border border-(--gold) bg-(--gold) px-4
                py-2 text-xs font-semibold tracking-widest text-(--navy-900)
                uppercase transition-colors
                hover:bg-(--cream)
              "
            >
              Add
            </button>
          </form>
        </div>

        {/* Existing players */}
        {players.length > 0 && (
          <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)' }}
          >
            {players.map((player, idx) => (
              <div
                key={player.id}
                className="flex items-center gap-4 px-5 py-3"
                style={{
                  borderBottom:
                    idx < players.length - 1
                      ? '1px solid color-mix(in srgb, var(--gold) 12%, transparent)'
                      : undefined,
                  background:
                    idx % 2 === 0
                      ? 'color-mix(in srgb, var(--navy-900) 90%, black)'
                      : 'transparent',
                }}
              >
                <form action={updatePlayerAction} className="
                  flex min-w-0 flex-1 items-center gap-3
                ">
                  <input type="hidden" name="id" value={player.id} />
                  <input
                    name="name"
                    type="text"
                    defaultValue={player.name}
                    required
                    className="
                      min-w-0 flex-1 rounded-sm border border-(--gold)/30
                      bg-transparent px-2 py-1.5 text-sm text-(--cream)
                      transition-colors
                      focus:border-(--gold) focus:outline-none
                    "
                  />
                  <select
                    name="tier"
                    defaultValue={player.tier}
                    className="
                      rounded-sm border border-(--gold)/30 bg-(--navy-900) px-2
                      py-1.5 text-xs text-(--cream) transition-colors
                      focus:border-(--gold) focus:outline-none
                    "
                  >
                    {PLAYER_TIER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="
                    shrink-0 text-xs text-(--cream)/30 tabular-nums
                  ">
                    {player.gameCount} {player.gameCount === 1 ? 'game' : 'games'}
                  </span>
                  <button
                    type="submit"
                    className="
                      font-cinzel shrink-0 text-xs tracking-widest
                      text-(--gold)/60 uppercase transition-colors
                      hover:text-(--gold)
                    "
                  >
                    Save
                  </button>
                </form>

                <ConfirmDeleteButton
                  formAction={deletePlayerAction}
                  hiddenFields={{ id: String(player.id) }}
                  confirmMessage={`Delete player "${player.name}"?`}
                  label="Delete"
                  className="
                    font-cinzel text-xs tracking-widest text-red-500/50
                    uppercase transition-colors
                    hover:text-red-400
                  "
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
