import { AdminShell } from '@/app/admin/AdminShell'
import { getSettings } from '@/lib/settings'
import { saveSettings } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const settings = await getSettings()

  return (
    <AdminShell>
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="font-cinzel text-xl tracking-wide text-[var(--gold)]">Settings</h1>
          <p className="mt-0.5 text-xs text-[var(--cream)]/50">App-wide configuration</p>
        </div>

        <div
          className="rounded-lg border p-5"
          style={{
            borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)',
            background: 'color-mix(in srgb, var(--navy-900) 80%, black)',
          }}
        >
          <p className="font-cinzel text-xs tracking-widest text-[var(--gold)] uppercase mb-4">
            Stats
          </p>
          <form action={saveSettings} className="flex items-end gap-4 flex-wrap">
            <div className="flex flex-col gap-1.5 flex-1 min-w-48">
              <label
                className="text-xs text-[var(--cream)]/50"
                htmlFor="win-rate-min-games"
              >
                Win Rate — Min Games Threshold
              </label>
              <input
                id="win-rate-min-games"
                name="win_rate_min_games"
                type="number"
                min="0"
                defaultValue={settings.winRateMinGames}
                className="rounded border border-[var(--gold)]/40 bg-[var(--navy-900)] px-3 py-2 text-sm text-[var(--cream)] placeholder:text-[var(--cream)]/30 focus:border-[var(--gold)] focus:outline-none transition-colors"
              />
            </div>
            <button
              type="submit"
              className="font-cinzel rounded border border-[var(--gold)] bg-[var(--gold)] px-4 py-2 text-xs font-semibold tracking-widest text-[var(--navy-900)] uppercase hover:bg-[var(--cream)] transition-colors"
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </AdminShell>
  )
}
