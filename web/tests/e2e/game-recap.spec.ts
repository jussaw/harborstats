import { expect, test } from '@playwright/test';
import { createE2eGame, createE2ePlayer, resetE2eDatabase } from './db';

// The recap surface is public and read-only: a shareable /games/{id} detail page
// reachable from every game card. These journeys exercise the real browser path
// (list card -> detail -> player -> back), the direct numeric route, standard
// 404s, and the unrated / no-winner / tie / large-roster shapes the design calls
// out. They also guard the GameCard e2e contract: cards stay <article>s whose
// text still exposes player names, scores, and notes even once wrapped in a link.

test.beforeEach(async () => {
  await resetE2eDatabase();
});

async function seedRatedTwoPlayerGame() {
  const ada = await createE2ePlayer({ name: 'Ada' });
  const bea = await createE2ePlayer({ name: 'Bea' });
  const game = await createE2eGame({
    playedAt: new Date('2026-05-01T18:00:00.000Z'),
    notes: 'Harbor decider',
    players: [
      { playerId: ada.id, score: 11, isWinner: true },
      { playerId: bea.id, score: 8, isWinner: false },
    ],
  });
  return { ada, bea, game };
}

test('a game card links to its recap and the full journey works', async ({ page }) => {
  const { ada, game } = await seedRatedTwoPlayerGame();

  await page.goto('/games');
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();

  // GameCard e2e contract: still an <article> exposing names, scores, and notes,
  // now wrapped in a recap link.
  const article = page.locator('article').first();
  await expect(article).toContainText('Ada');
  await expect(article).toContainText('11');
  await expect(article).toContainText('Bea');
  await expect(article).toContainText('8');
  await expect(article).toContainText('Harbor decider');

  const recapLink = page.getByRole('link', { name: /view recap for the game/i });
  await expect(recapLink).toBeVisible();
  await recapLink.click();

  await expect(page).toHaveURL(new RegExp(`/games/${game.id}$`));

  // Winner, scoreboard, public notes, and rated Elo impact.
  await expect(page.getByRole('heading', { level: 1, name: 'Ada wins' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Scoreboard' })).toBeVisible();
  await expect(page.getByText('Elo shown as of this game.')).toBeVisible();
  await expect(page.getByText('Harbor decider')).toBeVisible();
  await expect(page.getByText('1512 Elo')).toBeVisible();
  await expect(page.getByText('+12')).toBeVisible();
  await expect(page.getByText('1488 Elo')).toBeVisible();
  await expect(page.getByText('−12')).toBeVisible();
  await expect(page.getByText('Unrated')).toHaveCount(0);

  // The winner is announced by an accessible marker, not colour alone.
  await expect(page.getByRole('link', { name: 'Ada (winner)' })).toBeVisible();
  const loserLink = page.getByRole('link', { name: 'Bea', exact: true });
  await expect(loserLink).toHaveAttribute('href', /\/players\//);

  // Player link navigates to that player's page.
  await page.getByRole('link', { name: 'Ada (winner)' }).click();
  await expect(page).toHaveURL(new RegExp(`/players/${ada.id}$`));
  await expect(page).toHaveTitle(/^Ada — HarborStats/);

  // Back to the recap, then the Back to games control returns to the list.
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/games/${game.id}$`));
  await page.getByRole('link', { name: 'Back to games' }).click();
  await expect(page).toHaveURL(/\/games$/);
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible();
});

test('a tie with an explicit winner highlights the winner regardless of score order', async ({
  page,
}) => {
  // Equal top scores: the scoreboard sorts by score then name (Anya before
  // Zane), but the winner flag must still crown Zane.
  const anya = await createE2ePlayer({ name: 'Anya' });
  const zane = await createE2ePlayer({ name: 'Zane' });
  const game = await createE2eGame({
    playedAt: new Date('2026-05-02T18:00:00.000Z'),
    notes: '',
    players: [
      { playerId: anya.id, score: 10, isWinner: false },
      { playerId: zane.id, score: 10, isWinner: true },
    ],
  });

  // Direct numeric route.
  await page.goto(`/games/${game.id}`);

  await expect(page.getByRole('heading', { level: 1, name: 'Zane wins' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Zane (winner)' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Anya', exact: true })).toBeVisible();
  // Rated: both movements shown.
  await expect(page.getByText('1512 Elo')).toBeVisible();
  await expect(page.getByText('1488 Elo')).toBeVisible();
  await expect(page.getByText('Unrated')).toHaveCount(0);
  // Empty notes render no Notes card.
  await expect(page.getByRole('heading', { name: 'Notes' })).toHaveCount(0);
});

test('a solo game is shown as unrated with no Elo impact and no notes card', async ({ page }) => {
  const ada = await createE2ePlayer({ name: 'Ada' });
  const game = await createE2eGame({
    playedAt: new Date('2026-05-03T18:00:00.000Z'),
    notes: '',
    players: [{ playerId: ada.id, score: 12, isWinner: true }],
  });

  await page.goto(`/games/${game.id}`);

  await expect(page.getByRole('heading', { level: 1, name: 'Ada wins' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ada (winner)' })).toBeVisible();
  await expect(page.getByText('Unrated')).toBeVisible();
  await expect(page.getByText(/Elo/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Notes' })).toHaveCount(0);
});

test('a game with no winner shows the no-winner heading and stays unrated', async ({ page }) => {
  // A tie with no recorded winner is not a Rated Game.
  const ada = await createE2ePlayer({ name: 'Ada' });
  const bea = await createE2ePlayer({ name: 'Bea' });
  const game = await createE2eGame({
    playedAt: new Date('2026-05-04T18:00:00.000Z'),
    notes: 'Called on darkness',
    players: [
      { playerId: ada.id, score: 9, isWinner: false },
      { playerId: bea.id, score: 9, isWinner: false },
    ],
  });

  await page.goto(`/games/${game.id}`);

  await expect(page.getByRole('heading', { level: 1, name: 'No winner recorded' })).toBeVisible();
  await expect(page.getByText('Called on darkness')).toBeVisible();
  await expect(page.getByText('Unrated')).toHaveCount(2);
  await expect(page.getByText(/Elo/)).toHaveCount(0);
});

test('a large-roster game lists every participant with the winner crowned', async ({ page }) => {
  const names = ['Ann', 'Ben', 'Cid', 'Dan', 'Eve', 'Fay'];
  const roster = await Promise.all(names.map((name) => createE2ePlayer({ name })));
  // One winner, distinct scores within the 0-30 range.
  const game = await createE2eGame({
    playedAt: new Date('2026-05-05T18:00:00.000Z'),
    notes: 'Full table',
    players: roster.map((player, index) => ({
      playerId: player.id,
      score: 20 - index * 2,
      isWinner: index === 0,
    })),
  });

  await page.goto(`/games/${game.id}`);

  await expect(page.getByRole('heading', { level: 1, name: 'Ann wins' })).toBeVisible();
  await Promise.all(
    names.map((name) =>
      expect(page.getByRole('link', { name: new RegExp(`^${name}`) })).toBeVisible(),
    ),
  );
  // Exactly one crowned winner; every seat is a rated participant.
  await expect(page.getByRole('link', { name: /\(winner\)/ })).toHaveCount(1);
  await expect(page.getByText('Unrated')).toHaveCount(0);
  await expect(page.getByText(/Elo/).first()).toBeVisible();
});

test('a missing numeric game id returns a standard 404', async ({ page }) => {
  const response = await page.goto('/games/999999');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Scoreboard' })).toHaveCount(0);
});

test('a non-numeric game id returns a standard 404', async ({ page }) => {
  const response = await page.goto('/games/not-a-number');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Scoreboard' })).toHaveCount(0);
});
