'use server';

import { revalidatePath } from 'next/cache';
import { updateRateMinGames } from '@/lib/settings';

export async function saveSettings(formData: FormData) {
  const winRateMinGames = Math.max(
    0,
    parseInt((formData.get('win_rate_min_games') as string) ?? '0', 10) || 0,
  );
  const podiumRateMinGames = Math.max(
    0,
    parseInt((formData.get('podium_rate_min_games') as string) ?? '0', 10) || 0,
  );

  await updateRateMinGames({ winRateMinGames, podiumRateMinGames });
  revalidatePath('/stats');
  revalidatePath('/admin/settings');
}
