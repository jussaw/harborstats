import { PageWidth } from '@/components/PageWidth';
import { getSettings } from '@/lib/settings';
import { saveSettings } from './actions';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await getSettings();

  return (
    <PageWidth width="5xl" className="px-6 py-8">
      <PageWidth as="div" width="3xl" className="space-y-8">
        <div>
          <h1 className="font-cinzel text-xl tracking-wide text-(--gold)">Settings</h1>
          <p className="mt-0.5 text-xs text-(--cream)/50">App-wide configuration</p>
        </div>

        <div
          className="rounded-lg border p-5"
          style={{
            borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)',
            background: 'color-mix(in srgb, var(--navy-900) 80%, black)',
          }}
        >
          <p
            className="
              font-cinzel mb-4 text-xs tracking-widest text-(--gold) uppercase
            "
          >
            Stats
          </p>
          <form action={saveSettings} className="flex flex-wrap items-end gap-4">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label
                className="flex flex-col gap-1.5 text-xs text-(--cream)/50"
                htmlFor="win-rate-min-games"
              >
                <span>Win Rate — Min Games Threshold</span>
                <input
                  id="win-rate-min-games"
                  name="win_rate_min_games"
                  type="number"
                  min="0"
                  defaultValue={settings.winRateMinGames}
                  className="
                    rounded-sm border border-(--gold)/40 bg-(--navy-900) px-3
                    py-2 text-sm text-(--cream) transition-colors
                    placeholder:text-(--cream)/30
                    focus:border-(--gold) focus:outline-none
                  "
                />
              </label>
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label
                className="flex flex-col gap-1.5 text-xs text-(--cream)/50"
                htmlFor="podium-rate-min-games"
              >
                <span>Podium Rate — Min Games Threshold</span>
                <input
                  id="podium-rate-min-games"
                  name="podium_rate_min_games"
                  type="number"
                  min="0"
                  defaultValue={settings.podiumRateMinGames}
                  className="
                    rounded-sm border border-(--gold)/40 bg-(--navy-900) px-3
                    py-2 text-sm text-(--cream) transition-colors
                    placeholder:text-(--cream)/30
                    focus:border-(--gold) focus:outline-none
                  "
                />
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
              Save
            </button>
          </form>
        </div>
      </PageWidth>
    </PageWidth>
  );
}
