import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { TEST_ENV } from '../helpers/test-env';
import { createE2eGame, createE2ePlayer, resetE2eDatabase } from './db';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin');
  await page.getByLabel('Password').fill(TEST_ENV.ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page.getByRole('heading', { name: 'Command Deck' })).toBeVisible();
}

async function downloadExport(page: Page, linkName: string): Promise<string> {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: linkName }).click();
  const download = await downloadPromise;
  const filePath = await download.path();
  return readFile(filePath, 'utf8');
}

test.beforeEach(async () => {
  await resetE2eDatabase();
});

test('redirects unauthenticated export requests to the admin login', async ({ request }) => {
  const response = await request.get('/admin/export?format=csv', { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain('/admin/login');
});

test('admin downloads the games CSV with all player rows', async ({ page }) => {
  const ada = await createE2ePlayer({ name: 'Ada' });
  const bea = await createE2ePlayer({ name: 'Bea' });
  await createE2eGame({
    playedAt: new Date('2026-02-03T19:30:00.000Z'),
    notes: 'Longest road drama',
    players: [
      { playerId: ada.id, score: 11, isWinner: true },
      { playerId: bea.id, score: 9, isWinner: false },
    ],
  });

  await loginAsAdmin(page);

  const csv = await downloadExport(page, 'Download CSV');
  const lines = csv.trim().split('\r\n');
  expect(lines[0]).toBe('game_id,played_at,notes,player,score,is_winner');
  expect(lines).toHaveLength(3);
  expect(csv).toContain('Ada,11,true');
  expect(csv).toContain('Bea,9,false');
  expect(csv).toContain('Longest road drama');
});

test('admin downloads the JSON export with games and roster', async ({ page }) => {
  const ada = await createE2ePlayer({ name: 'Ada' });
  await createE2eGame({
    players: [{ playerId: ada.id, score: 10, isWinner: true }],
  });

  await loginAsAdmin(page);

  const body = JSON.parse(await downloadExport(page, 'Download JSON'));
  expect(body.players).toHaveLength(1);
  expect(body.games).toHaveLength(1);
  expect(body.games[0].players[0]).toMatchObject({
    playerName: 'Ada',
    score: 10,
    isWinner: true,
  });
});
