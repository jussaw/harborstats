'use server'

import { revalidatePath } from 'next/cache'
import { updateWinRateMinGames } from '@/lib/settings'

export async function saveSettings(formData: FormData) {
  const raw = formData.get('win_rate_min_games')
  const value = Math.max(0, parseInt(raw as string, 10) || 0)
  await updateWinRateMinGames(value)
  revalidatePath('/stats')
  revalidatePath('/admin/settings')
}
