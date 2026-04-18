'use server'

import { redirect } from 'next/navigation'
import { createPlayer, renamePlayer, updatePlayerTier, deletePlayer, PlayerInUseError } from '@/lib/players'

export async function createPlayerAction(formData: FormData) {
  const name = ((formData.get('name') as string) ?? '').trim()
  const tier = (formData.get('tier') as string) ?? 'standard'
  if (!name) redirect('/admin/players?error=name-required')
  await createPlayer(name, tier)
  redirect('/admin/players')
}

export async function updatePlayerAction(formData: FormData) {
  const id = Number(formData.get('id'))
  const name = ((formData.get('name') as string) ?? '').trim()
  const tier = (formData.get('tier') as string) ?? 'standard'
  if (!name) redirect('/admin/players?error=name-required')
  await renamePlayer(id, name)
  await updatePlayerTier(id, tier)
  redirect('/admin/players')
}

export async function deletePlayerAction(formData: FormData) {
  const id = Number(formData.get('id'))
  try {
    await deletePlayer(id)
  } catch (err) {
    if (err instanceof PlayerInUseError) {
      redirect(`/admin/players?error=player-in-use&count=${err.gameCount}`)
    }
    throw err
  }
  redirect('/admin/players')
}
