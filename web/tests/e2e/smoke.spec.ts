import { expect, test, type Page } from '@playwright/test'
import { PlayerTier } from '../../lib/player-tier'
import { TEST_ENV } from '../helpers/test-env'
import { createE2eGame, createE2ePlayer, resetE2eDatabase } from './db'

async function loginAsAdmin(page: Page, nextPath = '/admin'): Promise<void> {
  await page.goto(nextPath)
  await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible()
  await page.getByLabel('Password').fill(TEST_ENV.ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Enter' }).click()
}

async function acceptNextDialog(page: Page): Promise<void> {
  page.once('dialog', async (dialog) => {
    await dialog.accept()
  })
}

async function openGamesFilters(page: Page): Promise<void> {
  const toggle = page.getByRole('button', { name: /filters/i })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
  }
}

async function openPlayersFilter(page: Page): Promise<void> {
  const trigger = page.getByLabel('Players')
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') {
    await trigger.click()
  }
}

function playerDeleteButton(page: Page, name: string) {
  return page
    .locator(`input[value="${name}"]`)
    .locator('xpath=ancestor::div[contains(@class, "gap-4")][1]')
    .getByRole('button', { name: 'Delete' })
}

test.beforeEach(async () => {
  await resetE2eDatabase()
})

test('home page loads and creates a game from the modal', async ({ page }) => {
  const ada = await createE2ePlayer({ name: 'Ada' })
  const bea = await createE2ePlayer({ name: 'Bea' })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1_000)

  await expect(page.getByRole('heading', { name: 'Recent Games' })).toBeVisible()
  await expect(page.getByText('No games yet')).toBeVisible()

  await page.getByRole('button', { name: '+ New Game' }).click()
  const dialog = page.locator('dialog')
  await expect(dialog.getByRole('heading', { name: 'New Game' })).toBeVisible()

  await dialog.locator('select').nth(0).selectOption(String(ada.id))
  await dialog.locator('input[type="number"]').nth(0).fill('10')
  await dialog.locator('select').nth(1).selectOption(String(bea.id))
  await dialog.locator('input[type="number"]').nth(1).fill('8')
  await dialog.getByLabel('Notes').fill('Smoke game')
  await dialog.getByRole('button', { name: 'Save Game' }).click()

  const card = page.locator('article').first()
  await expect(card).toContainText('Smoke game')
  await expect(card).toContainText('Ada')
  await expect(card).toContainText('10')
  await expect(card).toContainText('Bea')
  await expect(card).toContainText('8')
  await expect(page.getByText('Show per page')).toHaveCount(0)
})

test('public games page paginates and supports page-size changes', async ({ page }) => {
  const ada = await createE2ePlayer({ name: 'Ada' })
  const bea = await createE2ePlayer({ name: 'Bea' })

  await Promise.all(Array.from({ length: 21 }, async (_unused, index) => {
    const gameNumber = index + 1
    return createE2eGame({
      playedAt: new Date(`2026-04-${String(gameNumber).padStart(2, '0')}T12:00:00.000Z`),
      notes: `Harbor game ${gameNumber}`,
      players: [
        { playerId: ada.id, score: 10 + gameNumber, isWinner: true },
        { playerId: bea.id, score: 5 + gameNumber, isWinner: false },
      ],
    })
  }))

  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Games' })).toBeVisible()
  await expect(page.locator('article')).toHaveCount(20)
  await expect(page).toHaveURL(/\/games$/)

  await page.getByRole('link', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/\/games\?page=2&pageSize=20/)
  await expect(page.locator('article')).toHaveCount(1)
  await expect(page.getByText('Harbor game 1')).toBeVisible()

  await page.getByRole('link', { name: '50', exact: true }).click()
  await expect(page).toHaveURL(/\/games\?page=1&pageSize=50/)
  await expect(page.locator('article')).toHaveCount(21)
})

test('public games page filters by players and date range while preserving pagination state', async ({ page }) => {
  const ada = await createE2ePlayer({ name: 'Ada' })
  const bea = await createE2ePlayer({ name: 'Bea' })
  const cara = await createE2ePlayer({ name: 'Cara' })

  await Promise.all(Array.from({ length: 12 }, async (_unused, index) => {
    const gameNumber = index + 1
    return createE2eGame({
      playedAt: new Date(`2026-04-${String(gameNumber).padStart(2, '0')}T12:00:00.000Z`),
      notes: `Ada game ${gameNumber}`,
      players: [{ playerId: ada.id, score: 10 + gameNumber, isWinner: true }],
    })
  }))

  await Promise.all(Array.from({ length: 10 }, async (_unused, index) => {
    const day = index + 13
    return createE2eGame({
      playedAt: new Date(`2026-04-${String(day).padStart(2, '0')}T12:00:00.000Z`),
      notes: `Bea game ${day}`,
      players: [{ playerId: bea.id, score: 20 + day, isWinner: true }],
    })
  }))

  await Promise.all(Array.from({ length: 3 }, async (_unused, index) => {
    const day = index + 23
    return createE2eGame({
      playedAt: new Date(`2026-04-${String(day).padStart(2, '0')}T12:00:00.000Z`),
      notes: `Cara game ${day}`,
      players: [{ playerId: cara.id, score: 30 + day, isWinner: true }],
    })
  }))

  await page.goto('/games')
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible()

  await openGamesFilters(page)
  await openPlayersFilter(page)
  await page.getByLabel('Ada').check()

  await expect(page).toHaveURL(/\/games\?page=1&pageSize=20&player=1$/)
  await expect(page.locator('article')).toHaveCount(12)
  await expect(page.getByRole('button', { name: /filters/i })).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByLabel('Players')).toHaveAttribute('aria-expanded', 'true')

  await page.getByLabel('Bea').check()

  await expect(page).toHaveURL(/\/games\?page=1&pageSize=20&player=1&player=2$/)
  await expect(page.locator('article')).toHaveCount(20)

  await page.getByRole('link', { name: '2', exact: true }).click()
  await expect(page).toHaveURL(/\/games\?page=2&pageSize=20&player=1&player=2$/)
  await expect(page.locator('article')).toHaveCount(2)

  await openGamesFilters(page)
  await page.locator('#games-filter-from').fill('2026-04-10T00:00')
  await page.locator('#games-filter-to').click()

  await expect(page).toHaveURL(/from=2026-04-10T00%3A00%3A00.000Z/)
  await expect(page).toHaveURL(/\/games\?page=1&pageSize=20&player=1&player=2&from=2026-04-10T00%3A00%3A00.000Z$/)
  await expect(page.locator('article')).toHaveCount(13)

  await openGamesFilters(page)
  await page.locator('#games-filter-to').fill('2026-04-24T23:59')
  await page.getByRole('button', { name: /clear players/i }).click()

  await expect(page).toHaveURL(
    /\/games\?page=1&pageSize=20&from=2026-04-10T00%3A00%3A00.000Z&to=2026-04-24T23%3A59%3A00.000Z$/,
  )
  await expect(page.locator('article')).toHaveCount(15)
  await expect(page.getByText('Cara game 24')).toBeVisible()
})

test('admin login, edit game, and logout work', async ({ page }) => {
  const ada = await createE2ePlayer({ name: 'Ada' })
  const bea = await createE2ePlayer({ name: 'Bea' })
  const cara = await createE2ePlayer({ name: 'Cara' })

  await createE2eGame({
    notes: 'Original harbor game',
    players: [
      { playerId: ada.id, score: 9, isWinner: true },
      { playerId: bea.id, score: 7, isWinner: false },
    ],
  })

  await loginAsAdmin(page)
  await expect(page.getByRole('heading', { name: 'Command Deck' })).toBeVisible()

  await page.goto('/admin/games')
  await expect(page.getByRole('heading', { name: 'Games' })).toBeVisible()
  await expect(page.getByText('Original harbor game')).toBeVisible()

  await page.getByRole('link', { name: 'Edit' }).click()
  await expect(page.getByRole('heading', { name: /Edit Game/ })).toBeVisible()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1_000)

  await page.locator('input[type="number"]').nth(0).fill('5')
  await page.locator('select').nth(1).selectOption(String(cara.id))
  await page.locator('input[type="number"]').nth(1).fill('11')
  await page.getByLabel('Notes').fill('Updated harbor game')
  await Promise.all([
    page.waitForURL(/\/admin\/games$/, { timeout: 15_000 }),
    page.getByRole('button', { name: 'Save Changes' }).click(),
  ])

  const updatedGame = page.locator('main').getByText('Updated harbor game').locator('..').locator('..')
  await expect(updatedGame).toContainText('Updated harbor game')
  await expect(updatedGame).toContainText('Cara')
  await expect(updatedGame).toContainText('11')

  await page.getByRole('button', { name: 'Logout' }).click()
  await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible()

  await page.goto('/admin/games')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByRole('heading', { name: 'Admin Access' })).toBeVisible()
})

test('admin can add, update, and delete players while blocking in-use deletes', async ({ page }) => {
  const busy = await createE2ePlayer({ name: 'Busy Player' })
  await createE2ePlayer({ name: 'Roster Mate', tier: PlayerTier.Premium })

  await createE2eGame({
    players: [{ playerId: busy.id, score: 10, isWinner: true }],
  })

  await loginAsAdmin(page, '/admin/players')
  await expect(page.getByRole('heading', { name: 'Players' })).toBeVisible()

  await page.getByLabel('Name').fill('Temp Player')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.locator('input[value="Temp Player"]')).toBeVisible()

  await page.locator('input[value="Roster Mate"]').fill('Harbor Mate')
  await page.getByRole('button', { name: 'Save' }).nth(0).click()
  await expect(page.locator('input[value="Harbor Mate"]')).toBeVisible()

  await acceptNextDialog(page)
  await playerDeleteButton(page, 'Temp Player').click()
  await expect(page.locator('input[value="Temp Player"]')).toHaveCount(0)

  await acceptNextDialog(page)
  await playerDeleteButton(page, 'Busy Player').click()
  await expect(page.getByText(/Cannot delete/)).toContainText('1 game')
  await expect(page.locator('input[value="Busy Player"]')).toBeVisible()
})

test('updating the win-rate threshold changes the stats view', async ({ page }) => {
  const ada = await createE2ePlayer({ name: 'Ada', tier: PlayerTier.Premium })
  const bea = await createE2ePlayer({ name: 'Bea' })

  await createE2eGame({
    notes: 'Ada win',
    players: [
      { playerId: ada.id, score: 10, isWinner: true },
      { playerId: bea.id, score: 8, isWinner: false },
    ],
  })
  await createE2eGame({
    notes: 'Bea win',
    players: [
      { playerId: ada.id, score: 9, isWinner: false },
      { playerId: bea.id, score: 11, isWinner: true },
    ],
  })
  await createE2eGame({
    notes: 'Ada solo win',
    players: [{ playerId: ada.id, score: 12, isWinner: true }],
  })

  await page.goto('/stats')
  const winRateSection = page.locator('section#win-rate')
  await expect(winRateSection).toContainText('Ada')
  await expect(winRateSection).toContainText('Bea')

  await loginAsAdmin(page, '/admin/settings')
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  await page.getByLabel('Win Rate — Min Games Threshold').fill('3')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect
    .poll(async () => {
      await page.goto('/stats')
      return page.locator('section#win-rate').textContent()
    })
    .toContain('Min 3 games')

  await page.goto('/stats')
  await expect(winRateSection).toContainText('Ada')
  await expect(winRateSection).not.toContainText('Bea')
})
