'use server'

import { redirect } from 'next/navigation'
import { requireAdminSession } from '@/lib/admin-auth'
import { parsePlayerTier } from '@/lib/player-tier'
import { createPlayer, renamePlayer, updatePlayerTier, deletePlayer, PlayerInUseError } from '@/lib/players'

export async function createPlayerAction(formData: FormData) {
  await requireAdminSession()
  const name = ((formData.get('name') as string) ?? '').trim()
  const tier = parsePlayerTier(formData.get('tier') as string | null)
  if (!name) redirect('/admin/players?error=name-required')
  await createPlayer(name, tier)
  redirect('/admin/players')
}

export async function updatePlayerAction(formData: FormData) {
  await requireAdminSession()
  const id = Number(formData.get('id'))
  const name = ((formData.get('name') as string) ?? '').trim()
  const tier = parsePlayerTier(formData.get('tier') as string | null)
  if (!name) redirect('/admin/players?error=name-required')
  await renamePlayer(id, name)
  await updatePlayerTier(id, tier)
  redirect('/admin/players')
}

export async function deletePlayerAction(formData: FormData) {
  await requireAdminSession()
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
