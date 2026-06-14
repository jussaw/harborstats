import { PageWidth } from '@/components/PageWidth';
import { buttonClasses } from '@/components/ui/Button';
import { cardSurfaceClasses } from '@/components/ui/Card';
import { fieldClasses } from '@/components/ui/Field';
import { getSettings, hasNewGamePassword } from '@/lib/settings';
import { saveSettings } from './actions';
import { GamePasswordForm } from './GamePasswordForm';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const [settings, isSet] = await Promise.all([getSettings(), hasNewGamePassword()]);

  return (
    <PageWidth width="5xl" className="px-6 py-8">
      <PageWidth as="div" width="3xl" className="space-y-8">
        <div>
          <h1 className="font-cinzel text-xl tracking-wide text-(--cream)">Settings</h1>
          <p className="mt-0.5 text-xs text-(--cream)/50">App-wide configuration</p>
        </div>

        <div
          className={`
            p-5
            ${cardSurfaceClasses}
          `}
        >
          <p
            className="
              mb-4 text-[10px] font-medium tracking-[0.2em] text-(--gold)
              uppercase
            "
          >
            Stats
          </p>
          <form action={saveSettings} className="flex flex-wrap items-end gap-4">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label
                className="
                  flex flex-col gap-1.5 text-xs font-medium text-(--cream)/60
                "
                htmlFor="win-rate-min-games"
              >
                <span>Win Rate — Min Games Threshold</span>
                <input
                  id="win-rate-min-games"
                  name="win_rate_min_games"
                  type="number"
                  min="0"
                  defaultValue={settings.winRateMinGames}
                  className={fieldClasses}
                />
              </label>
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label
                className="
                  flex flex-col gap-1.5 text-xs font-medium text-(--cream)/60
                "
                htmlFor="podium-rate-min-games"
              >
                <span>Podium Rate — Min Games Threshold</span>
                <input
                  id="podium-rate-min-games"
                  name="podium_rate_min_games"
                  type="number"
                  min="0"
                  defaultValue={settings.podiumRateMinGames}
                  className={fieldClasses}
                />
              </label>
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label
                className="
                  flex flex-col gap-1.5 text-xs font-medium text-(--cream)/60
                "
                htmlFor="stat-card-min-games"
              >
                <span>Stat Cards — Min Games Threshold</span>
                <input
                  id="stat-card-min-games"
                  name="stat_card_min_games"
                  type="number"
                  min="0"
                  defaultValue={settings.statCardMinGames}
                  className={fieldClasses}
                />
              </label>
            </div>
            <button type="submit" className={buttonClasses('primary', 'sm')}>
              Save
            </button>
          </form>
        </div>

        <GamePasswordForm isSet={isSet} />
      </PageWidth>
    </PageWidth>
  );
}
