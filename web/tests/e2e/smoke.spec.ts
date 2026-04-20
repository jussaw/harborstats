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
