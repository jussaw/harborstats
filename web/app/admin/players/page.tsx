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
  const error = params.error
  const inUseCount = params.count

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="font-cinzel text-xl tracking-wide text-[var(--gold)]">Players</h1>
          <p className="mt-0.5 text-xs text-[var(--cream)]/50">{players.length} on roster</p>
        </div>

        {error === 'player-in-use' && (
          <p className="rounded border border-amber-500/40 bg-amber-950/40 px-4 py-2.5 text-sm text-amber-300">
            Cannot delete — this player appears in {inUseCount} game
            {inUseCount === '1' ? '' : 's'}. Remove those games first.
          </p>
        )}
        {error === 'name-required' && (
          <p className="rounded border border-red-500/40 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
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
          <p className="font-cinzel text-xs tracking-widest text-[var(--gold)] uppercase mb-4">
            Add Player
          </p>
          <form action={createPlayerAction} className="flex items-end gap-3 flex-wrap">
            <div className="flex flex-col gap-1.5 flex-1 min-w-40">
              <label className="text-xs text-[var(--cream)]/50" htmlFor="new-name">
                Name
              </label>
              <input
                id="new-name"
                name="name"
                type="text"
                required
                placeholder="Player name"
                className="rounded border border-[var(--gold)]/40 bg-[var(--navy-900)] px-3 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--cream)]/30 focus:border-[var(--gold)] focus:outline-none transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--cream)]/50" htmlFor="new-tier">
                Tier
              </label>
              <select
                id="new-tier"
                name="tier"
                className="rounded border border-[var(--gold)]/40 bg-[var(--navy-900)] px-3 py-2 text-sm text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none transition-colors"
              >
                {PLAYER_TIER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="font-cinzel rounded border border-[var(--gold)] bg-[var(--gold)] px-4 py-2 text-xs font-semibold tracking-widest text-[var(--navy-900)] uppercase hover:bg-[var(--cream)] transition-colors"
            >
              Add
            </button>
          </form>
        </div>

        {/* Existing players */}
        {players.length > 0 && (
          <div
            className="rounded-lg border overflow-hidden"
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
                <form action={updatePlayerAction} className="flex items-center gap-3 flex-1 min-w-0">
                  <input type="hidden" name="id" value={player.id} />
                  <input
                    name="name"
                    type="text"
                    defaultValue={player.name}
                    required
                    className="flex-1 min-w-0 rounded border border-[var(--gold)]/30 bg-transparent px-2 py-1.5 text-sm text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                  />
                  <select
                    name="tier"
                    defaultValue={player.tier}
                    className="rounded border border-[var(--gold)]/30 bg-[var(--navy-900)] px-2 py-1.5 text-xs text-[var(--cream)] focus:border-[var(--gold)] focus:outline-none transition-colors"
                  >
                    {PLAYER_TIER_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-[var(--cream)]/30 tabular-nums shrink-0">
                    {player.gameCount} {player.gameCount === 1 ? 'game' : 'games'}
                  </span>
                  <button
                    type="submit"
                    className="font-cinzel text-xs tracking-widest text-[var(--gold)]/60 uppercase hover:text-[var(--gold)] transition-colors shrink-0"
                  >
                    Save
                  </button>
                </form>

                <ConfirmDeleteButton
                  formAction={deletePlayerAction}
                  hiddenFields={{ id: String(player.id) }}
                  confirmMessage={`Delete player "${player.name}"?`}
                  className="font-cinzel text-xs tracking-widest text-red-500/50 uppercase hover:text-red-400 transition-colors"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
