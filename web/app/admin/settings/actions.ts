'use server';

import { revalidatePath } from 'next/cache';
import { requireAdminSession } from '@/lib/admin-auth';
import { updateRateMinGames, setNewGamePassword, InvalidPasswordError } from '@/lib/settings';
import { recordAudit } from '@/lib/audit';

export async function saveSettings(formData: FormData) {
  await requireAdminSession();
  const winRateMinGames = Math.max(
    0,
    parseInt((formData.get('win_rate_min_games') as string) ?? '0', 10) || 0,
  );
  const podiumRateMinGames = Math.max(
    0,
    parseInt((formData.get('podium_rate_min_games') as string) ?? '0', 10) || 0,
  );
  const statCardMinGames = Math.max(
    0,
    parseInt((formData.get('stat_card_min_games') as string) ?? '0', 10) || 0,
  );

  await updateRateMinGames({ winRateMinGames, podiumRateMinGames, statCardMinGames });
  await recordAudit({
    action: 'settings.update',
    actorType: 'admin',
    entityType: 'settings',
    summary: 'Updated stat thresholds',
    metadata: { winRateMinGames, podiumRateMinGames, statCardMinGames },
  });
  revalidatePath('/stats');
  revalidatePath('/admin/settings');
}

export interface SetPasswordState {
  ok?: boolean
  error?: string
}

export async function setNewGamePasswordAction(
  _prev: SetPasswordState,
  formData: FormData,
): Promise<SetPasswordState> {
  await requireAdminSession()
  const plain = (formData.get('new_game_password') as string) ?? ''

  try {
    await setNewGamePassword(plain)
  } catch (err) {
    if (err instanceof InvalidPasswordError) {
      return { ok: false, error: err.message }
    }
    return { ok: false, error: 'Failed to save password.' }
  }

  // Record only that the password changed — never the password or its hash.
  await recordAudit({
    action: 'settings.password_change',
    actorType: 'admin',
    entityType: 'settings',
    summary: 'Changed the new-game password',
  })

  revalidatePath('/admin/settings')
  revalidatePath('/')
  return { ok: true }
}
