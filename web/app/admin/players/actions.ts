'use server';

import { redirect } from 'next/navigation';
import { requireAdminSession } from '@/lib/admin-auth';
import { parsePlayerTier } from '@/lib/player-tier';
import { createPlayer, updatePlayer, deletePlayer, PlayerInUseError } from '@/lib/players';
import { recordAudit } from '@/lib/audit';

export async function createPlayerAction(formData: FormData) {
  await requireAdminSession();
  const name = ((formData.get('name') as string) ?? '').trim();
  const tier = parsePlayerTier(formData.get('tier') as string | null);
  if (!name) redirect('/admin/players?error=name-required');
  const id = await createPlayer(name, tier);
  await recordAudit({
    action: 'player.create',
    actorType: 'admin',
    entityType: 'player',
    entityId: id,
    summary: `Added player "${name}"`,
    metadata: { name, tier },
  });
  redirect('/admin/players');
}

export async function updatePlayerAction(formData: FormData) {
  await requireAdminSession();
  const id = Number(formData.get('id'));
  const name = ((formData.get('name') as string) ?? '').trim();
  const tier = parsePlayerTier(formData.get('tier') as string | null);
  if (!name) redirect('/admin/players?error=name-required');
  // Only audit a real update: a malformed/nonpositive id, or a stale update
  // where no row matched, must not record a false player.update success. Either
  // way we land back on the (now up-to-date) players list, so there's no
  // user-visible error state to surface.
  if (Number.isInteger(id) && id > 0 && (await updatePlayer(id, name, tier))) {
    await recordAudit({
      action: 'player.update',
      actorType: 'admin',
      entityType: 'player',
      entityId: id,
      summary: `Updated player "${name}"`,
      metadata: { name, tier },
    });
  }
  redirect('/admin/players');
}

export async function deletePlayerAction(formData: FormData) {
  await requireAdminSession();
  const id = Number(formData.get('id'));
  try {
    // Only audit a real deletion: a malformed/nonpositive id, or a stale/double
    // delete where no row matched, must not record a false player.delete
    // success. Either way we land back on the (now up-to-date) players list, so
    // there's no user-visible error state to surface.
    if (Number.isInteger(id) && id > 0 && (await deletePlayer(id))) {
      await recordAudit({
        action: 'player.delete',
        actorType: 'admin',
        entityType: 'player',
        entityId: id,
        summary: `Deleted player #${id}`,
      });
    }
  } catch (err) {
    if (err instanceof PlayerInUseError) {
      redirect(`/admin/players?error=player-in-use&count=${err.gameCount}`);
    }
    throw err;
  }
  redirect('/admin/players');
}
