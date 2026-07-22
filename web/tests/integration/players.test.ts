import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { players } from '@/db/schema';
import { PlayerTier } from '@/lib/player-tier';
import {
  createPlayer,
  deletePlayer,
  getPlayerById,
  getPlayers,
  listPlayersWithUsage,
  PlayerInUseError,
  renamePlayer,
  updatePlayer,
  updatePlayerTier,
} from '@/lib/players';
import { db } from '@/lib/db';
import { createTestGame, createTestPlayer } from '@/tests/helpers/db';

describe('players lib', () => {
  it('orders players by tier and then by name', async () => {
    await createTestPlayer({ name: 'Zed', tier: PlayerTier.Standard });
    await createTestPlayer({ name: 'Bea', tier: PlayerTier.Premium });
    await createTestPlayer({ name: 'Amy', tier: PlayerTier.Standard });
    await createTestPlayer({ name: 'Ada', tier: PlayerTier.Premium });

    await expect(getPlayers()).resolves.toEqual([
      expect.objectContaining({ name: 'Ada', tier: PlayerTier.Premium }),
      expect.objectContaining({ name: 'Bea', tier: PlayerTier.Premium }),
      expect.objectContaining({ name: 'Amy', tier: PlayerTier.Standard }),
      expect.objectContaining({ name: 'Zed', tier: PlayerTier.Standard }),
    ]);
  });

  it('gets a player by id and returns null for a missing id', async () => {
    const player = await createTestPlayer({ name: 'Ada', tier: PlayerTier.Premium });

    await expect(getPlayerById(player.id)).resolves.toEqual(expect.objectContaining(player));
    await expect(getPlayerById(9999)).resolves.toBeNull();
  });

  it('lists players with usage counts in tier and name order', async () => {
    const ada = await createTestPlayer({ name: 'Ada', tier: PlayerTier.Premium });
    const bea = await createTestPlayer({ name: 'Bea', tier: PlayerTier.Standard });
    const cara = await createTestPlayer({ name: 'Cara', tier: PlayerTier.Standard });

    await createTestGame({
      players: [
        { playerId: ada.id, score: 10, isWinner: true },
        { playerId: bea.id, score: 8, isWinner: false },
      ],
    });
    await createTestGame({
      players: [
        { playerId: ada.id, score: 7, isWinner: false },
        { playerId: cara.id, score: 11, isWinner: true },
      ],
    });

    await expect(listPlayersWithUsage()).resolves.toEqual([
      expect.objectContaining({ id: ada.id, name: 'Ada', tier: PlayerTier.Premium, gameCount: 2 }),
      expect.objectContaining({ id: bea.id, name: 'Bea', tier: PlayerTier.Standard, gameCount: 1 }),
      expect.objectContaining({
        id: cara.id,
        name: 'Cara',
        tier: PlayerTier.Standard,
        gameCount: 1,
      }),
    ]);
  });

  it('creates, renames, and retiers a player', async () => {
    await createPlayer('Mina', PlayerTier.Premium);

    const created = await db.select().from(players).where(eq(players.name, 'Mina'));
    const playerId = created[0]?.id;

    expect(playerId).toBeDefined();

    if (playerId === undefined) {
      throw new Error('Expected createPlayer to persist a player id');
    }

    await renamePlayer(playerId, 'Mina Harbor');
    await updatePlayerTier(playerId, PlayerTier.Standard);

    await expect(getPlayerById(playerId)).resolves.toEqual(
      expect.objectContaining({
        id: playerId,
        name: 'Mina Harbor',
        tier: PlayerTier.Standard,
      }),
    );
  });

  it('updatePlayer atomically applies name and tier and reports the update', async () => {
    const player = await createTestPlayer({ name: 'Nadia', tier: PlayerTier.Standard });

    await expect(updatePlayer(player.id, 'Nadia Cove', PlayerTier.Premium)).resolves.toBe(true);

    await expect(getPlayerById(player.id)).resolves.toEqual(
      expect.objectContaining({
        id: player.id,
        name: 'Nadia Cove',
        tier: PlayerTier.Premium,
      }),
    );
  });

  it('updatePlayer reports no match and changes nothing for a missing id', async () => {
    const player = await createTestPlayer({ name: 'Untouched', tier: PlayerTier.Standard });

    await expect(updatePlayer(9999, 'Ghost', PlayerTier.Premium)).resolves.toBe(false);

    // The unrelated player is left exactly as it was.
    await expect(getPlayerById(player.id)).resolves.toEqual(
      expect.objectContaining({
        id: player.id,
        name: 'Untouched',
        tier: PlayerTier.Standard,
      }),
    );
    const ghost = await db.select().from(players).where(eq(players.name, 'Ghost'));
    expect(ghost).toHaveLength(0);
  });

  it('deletes an unused player successfully', async () => {
    const player = await createTestPlayer({ name: 'Delete Me' });

    await expect(deletePlayer(player.id)).resolves.toBe(true);

    await expect(getPlayerById(player.id)).resolves.toBeNull();
  });

  it('reports whether a row was removed and is a no-op on a repeat/missing delete', async () => {
    const target = await createTestPlayer({ name: 'Delete Me' });
    const survivor = await createTestPlayer({ name: 'Keep Me' });

    // First delete removes the row and reports success.
    await expect(deletePlayer(target.id)).resolves.toBe(true);
    // Second (stale/double) delete matches nothing and reports no-op.
    await expect(deletePlayer(target.id)).resolves.toBe(false);
    // An id that never existed also reports no-op.
    await expect(deletePlayer(999999)).resolves.toBe(false);

    // The unrelated player is untouched by any of the above.
    await expect(getPlayerById(survivor.id)).resolves.not.toBeNull();
  });

  it('throws PlayerInUseError when deleting a referenced player', async () => {
    const player = await createTestPlayer({ name: 'Busy Player' });

    await createTestGame({
      players: [{ playerId: player.id, score: 10, isWinner: true }],
    });

    await expect(deletePlayer(player.id)).rejects.toEqual(expect.any(PlayerInUseError));
    await expect(deletePlayer(player.id)).rejects.toMatchObject({
      gameCount: 1,
      message: 'Player is referenced in 1 game(s) and cannot be deleted',
    });
  });
});
