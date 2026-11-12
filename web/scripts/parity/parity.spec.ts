/* eslint-disable no-restricted-syntax, no-await-in-loop -- the crawl visits pages one at a time, in a fixed order, on purpose */
/**
 * Old-vs-new parity crawl for the Postgres → SQLite switchover.
 *
 * Visits the same URLs on the old app (Postgres) and the new app (SQLite) and
 * compares what a visitor sees: the page's visible text, a structural
 * signature, form control values, links, status and title. Saves a screenshot
 * of each side. With PARITY_WRITES=1 it then performs the same writes on both
 * apps and compares again after each one. See README.md for setup and the
 * normalization rules.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test'
import { COOKIE_NAME, signSession } from '../../lib/admin-auth'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required (see scripts/parity/README.md)`)
  return value
}

const OLD_URL = requireEnv('OLD_URL').replace(/\/$/, '')
const NEW_URL = requireEnv('NEW_URL').replace(/\/$/, '')
const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD')
// signSession() reads it: the read section signs its own admin cookie so it
// never logs in through the form, which would write an audit row.
requireEnv('ADMIN_SESSION_SECRET')
const { GAME_PASSWORD } = process.env
const WRITES = process.env.PARITY_WRITES === '1'

const OUT_DIR = join(__dirname, '../../test-results/parity')
const SCREENS_DIR = join(OUT_DIR, 'screens')

// What real visitors use; FormattedDate renders in the browser's time zone.
const CONTEXT_OPTIONS = {
  timezoneId: 'America/New_York',
  locale: 'en-US',
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 1,
} as const

interface Snapshot {
  status: number | null
  path: string
  title: string
  lines: string[]
  structure: string[]
  controls: string[]
  links: string[]
}

interface Comparison {
  section: string
  label: string
  path: string
  differences: string[]
  screenshotsIdentical: boolean
  // Set when the differences are an owner-accepted one (see README.md).
  accepted?: string
}

interface Side {
  name: 'old' | 'new'
  base: string
  context: BrowserContext
  page: Page
}

interface Pair {
  old: Side
  new: Side
}

interface ExportPlayer {
  id: number
  name: string
  tier: string
}

interface ExportGame {
  id: number
  playedAt: string
  notes: string
  players: { playerName: string }[]
}

interface ExportData {
  players: ExportPlayer[]
  games: ExportGame[]
}

const comparisons: Comparison[] = []
let screenshotIndex = 0

mkdirSync(SCREENS_DIR, { recursive: true })

async function openSide(
  browser: Browser,
  name: Side['name'],
  base: string,
  admin: boolean,
): Promise<Side> {
  const context = await browser.newContext(CONTEXT_OPTIONS)
  if (admin) {
    await context.addCookies([
      { name: COOKIE_NAME, value: await signSession(), url: base, httpOnly: true, sameSite: 'Lax' },
    ])
  }
  const page = await context.newPage()
  return { name, base, context, page }
}

async function openPair(browser: Browser, admin: boolean): Promise<Pair> {
  return {
    old: await openSide(browser, 'old', OLD_URL, admin),
    new: await openSide(browser, 'new', NEW_URL, admin),
  }
}

async function closePair(pair: Pair): Promise<void> {
  await pair.old.context.close()
  await pair.new.context.close()
}

/**
 * Reads what the visitor sees. `maskFrom` (write section only) replaces the
 * text of <time> elements at or after the write run's start: rows the run
 * creates get each app's own clock time, seconds apart.
 */
async function readPage(page: Page, maskFrom: string | null): Promise<Omit<Snapshot, 'status'>> {
  await page.waitForLoadState('networkidle')
  // FormattedDate shows '...' until the browser time zone is resolved.
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll('time')).every((t) => t.textContent !== '...'),
  )
  return page.evaluate((maskFromIso) => {
    const root = document.body
    if (maskFromIso) {
      root.querySelectorAll<HTMLTimeElement>('time[datetime]').forEach((time) => {
        // eslint-disable-next-line no-param-reassign -- masking the rendered page is the point
        if (time.dateTime >= maskFromIso) time.textContent = '<during run>'
      })
    }
    const clean = (s: string) => s.replace(/\s+/g, ' ').trim()
    // Accepted difference 1 (README): rows tied on every Total Wins column but
    // the name are compared in name order. The old app left them in Postgres'
    // hash order; the new app orders them by name.
    const totalWins = root.querySelector<HTMLTableElement>('section#total-wins table')
    const playerColumn = totalWins?.tHead
      ? Array.from(totalWins.tHead.rows[0].cells).findIndex((c) => clean(c.textContent ?? '') === 'Player')
      : -1
    if (totalWins && playerColumn >= 0) {
      const body = totalWins.tBodies[0]
      const cellsOf = (row: HTMLTableRowElement) => Array.from(row.cells, (c) => clean(c.innerText))
      const tieKey = (row: HTMLTableRowElement) =>
        cellsOf(row).filter((_, i) => i !== playerColumn).join('|')
      const nameOf = (row: HTMLTableRowElement) => cellsOf(row)[playerColumn].toLowerCase()
      const groups: HTMLTableRowElement[][] = []
      Array.from(body.rows).forEach((row) => {
        const last = groups.at(-1)
        if (last && tieKey(last[0]) === tieKey(row)) last.push(row)
        else groups.push([row])
      })
      groups
        .flatMap((group) => [...group].sort((x, y) => nameOf(x).localeCompare(nameOf(y), 'en')))
        .forEach((row) => body.appendChild(row))
    }
    const lines = root.innerText.split('\n').map(clean).filter(Boolean)
    const structure = Array.from(
      root.querySelectorAll<HTMLElement>(
        'h1,h2,h3,h4,h5,h6,th,td,article,li,dt,dd,caption,figcaption,[role=alert],[role=status]',
      ),
    ).map((el) => `${el.tagName.toLowerCase()}|${clean(el.innerText)}`)
    const controls = Array.from(
      root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        'input,select,textarea',
      ),
    ).flatMap((el) => {
      const name = el.getAttribute('name') ?? el.id
      if (el instanceof HTMLSelectElement) {
        return [`select[${name}]=${Array.from(el.selectedOptions, (o) => clean(o.text)).join('|')}`]
      }
      if (el instanceof HTMLTextAreaElement) return [`textarea[${name}]=${el.value}`]
      // Server-action ids are per-build hashes, not data.
      if (el.type === 'hidden' && name.startsWith('$ACTION')) return []
      if (el.type === 'checkbox' || el.type === 'radio') return [`input:${el.type}[${name}]=${el.checked}`]
      return [`input:${el.type}[${name}]=${el.value}`]
    })
    const links = Array.from(root.querySelectorAll('a[href]'), (a) => a.getAttribute('href') ?? '')
      .filter((href) => !href.startsWith('/_next/'))
    return {
      path: `${window.location.pathname}${window.location.search}`,
      title: document.title,
      lines,
      structure,
      controls,
      links,
    }
  }, maskFrom)
}

async function capture(side: Side, path: string | null, maskFrom: string | null) {
  let status: number | null = null
  if (path !== null) {
    const response = await side.page.goto(`${side.base}${path}`, { waitUntil: 'networkidle' })
    status = response?.status() ?? null
  }
  const snapshot: Snapshot = { status, ...(await readPage(side.page, maskFrom)) }
  const screenshot = await side.page.screenshot({
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
  })
  return { snapshot, screenshot }
}

function diffLists(name: string, a: string[], b: string[]): string[] {
  if (isDeepStrictEqual(a, b)) return []
  const out: string[] = []
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < 8; i += 1) {
    if (a[i] !== b[i]) out.push(`${name}[${i}]: old=${JSON.stringify(a[i])} new=${JSON.stringify(b[i])}`)
  }
  if (a.length !== b.length) out.push(`${name}: old has ${a.length}, new has ${b.length}`)
  return out
}

function diffSnapshots(a: Snapshot, b: Snapshot): string[] {
  const scalars = (['status', 'path', 'title'] as const)
    .filter((key) => a[key] !== b[key])
    .map((key) => `${key}: old=${JSON.stringify(a[key])} new=${JSON.stringify(b[key])}`)
  return [
    ...scalars,
    ...diffLists('text', a.lines, b.lines),
    ...diffLists('structure', a.structure, b.structure),
    ...diffLists('controls', a.controls, b.controls),
    ...diffLists('links', a.links, b.links),
  ]
}

// Differences are asserted once, in the last test, so a difference in one
// section never stops the sections after it (serial mode skips the rest of
// the file after a failed test).
function record(comparison: Comparison): void {
  comparisons.push(comparison)
}

function slug(path: string): string {
  return path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 80) || 'root'
}

interface CompareOptions {
  maskFrom?: string | null
  // Off by default: a lost session would otherwise make two login pages match.
  allowRedirect?: boolean
}

/** Compares one URL, or with `path` null the pages each side is on now. */
async function compare(
  pair: Pair,
  section: string,
  label: string,
  path: string | null,
  { maskFrom = null, allowRedirect = false }: CompareOptions = {},
): Promise<{ comparison: Comparison; old: Snapshot; new: Snapshot }> {
  const [oldCapture, newCapture] = await Promise.all([
    capture(pair.old, path, maskFrom),
    capture(pair.new, path, maskFrom),
  ])
  screenshotIndex += 1
  const base = `${String(screenshotIndex).padStart(4, '0')}-${slug(path ?? `${label} ${oldCapture.snapshot.path}`)}`
  writeFileSync(join(SCREENS_DIR, `${base}.old.png`), oldCapture.screenshot)
  writeFileSync(join(SCREENS_DIR, `${base}.new.png`), newCapture.screenshot)
  const redirects =
    path === null || allowRedirect
      ? []
      : ([['old', oldCapture], ['new', newCapture]] as const)
          .filter(([, { snapshot }]) => snapshot.path !== path)
          .map(([side, { snapshot }]) => `redirected (${side}): requested=${path} landed=${snapshot.path}`)
  const comparison: Comparison = {
    section,
    label,
    path: path ?? `(current) ${oldCapture.snapshot.path}`,
    differences: [...redirects, ...diffSnapshots(oldCapture.snapshot, newCapture.snapshot)],
    screenshotsIdentical: oldCapture.screenshot.equals(newCapture.screenshot),
  }
  record(comparison)
  return { comparison, old: oldCapture.snapshot, new: newCapture.snapshot }
}

const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

function maskJson(value: unknown, maskFrom: string | null): unknown {
  if (typeof value === 'string') {
    return maskFrom && ISO_TIMESTAMP.test(value) && value >= maskFrom ? '<during run>' : value
  }
  if (Array.isArray(value)) return value.map((v) => maskJson(v, maskFrom))
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, maskJson(v, maskFrom)]),
    )
  }
  return value
}

function diffJson(a: unknown, b: unknown, path = '$', out: string[] = []): string[] {
  if (out.length >= 10 || isDeepStrictEqual(a, b)) return out
  if (
    a &&
    b &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    Array.isArray(a) === Array.isArray(b)
  ) {
    const left = a as Record<string, unknown>
    const right = b as Record<string, unknown>
    new Set([...Object.keys(left), ...Object.keys(right)]).forEach((key) =>
      diffJson(left[key], right[key], `${path}.${key}`, out),
    )
    if (Array.isArray(a) && Array.isArray(b) && a.length !== b.length) {
      out.push(`${path}: old has ${a.length} items, new has ${b.length}`)
    }
    return out
  }
  out.push(`${path}: old=${JSON.stringify(a)} new=${JSON.stringify(b)}`)
  return out
}

// Fetched from inside the page, as a browser download would be: the admin
// cookie the login form sets is Secure in production, which Playwright's API
// request context will not send over http.
async function fetchExport(side: Side, format: 'json' | 'csv') {
  if (!side.page.url().startsWith(side.base)) await side.page.goto(`${side.base}/players`)
  return side.page.evaluate(async (url) => {
    const response = await fetch(url, { credentials: 'same-origin' })
    return {
      status: response.status,
      contentType: response.headers.get('content-type') ?? '',
      disposition: response.headers.get('content-disposition') ?? '',
      body: await response.text(),
    }
  }, `/admin/export?format=${format}`)
}

/** The JSON export, parsed; `exportedAt` is the request time, not data. */
async function compareExport(pair: Pair, section: string, maskFrom: string | null = null) {
  const [oldJson, newJson] = await Promise.all([
    fetchExport(pair.old, 'json'),
    fetchExport(pair.new, 'json'),
  ])
  const parse = (body: string) => {
    const { exportedAt, ...data } = JSON.parse(body) as Record<string, unknown>
    expect(typeof exportedAt).toBe('string')
    return maskJson(data, maskFrom)
  }
  const differences = [
    ...(['status', 'contentType', 'disposition'] as const)
      .filter((key) => oldJson[key] !== newJson[key])
      .map((key) => `${key}: old=${JSON.stringify(oldJson[key])} new=${JSON.stringify(newJson[key])}`),
    ...diffJson(parse(oldJson.body), parse(newJson.body)),
  ]
  record({ section, label: 'export json', path: '/admin/export?format=json', differences, screenshotsIdentical: true })
  return JSON.parse(oldJson.body) as ExportData
}

async function compareCsvExport(pair: Pair, section: string) {
  const [oldCsv, newCsv] = await Promise.all([fetchExport(pair.old, 'csv'), fetchExport(pair.new, 'csv')])
  const differences = (['status', 'contentType', 'disposition'] as const)
    .filter((key) => oldCsv[key] !== newCsv[key])
    .map((key) => `${key}: old=${JSON.stringify(oldCsv[key])} new=${JSON.stringify(newCsv[key])}`)
  differences.push(...diffLists('csv', oldCsv.body.split('\n'), newCsv.body.split('\n')))
  record({ section, label: 'export csv', path: '/admin/export?format=csv', differences, screenshotsIdentical: true })
}

function writeReport(): void {
  const differing = comparisons.filter((c) => c.differences.length > 0 && !c.accepted)
  const accepted = comparisons.filter((c) => c.differences.length > 0 && c.accepted)
  const screenshotDiffs = comparisons.filter((c) => !c.screenshotsIdentical)
  const sections = [...new Set(comparisons.map((c) => c.section))].map(
    (section) => `${section}: ${comparisons.filter((c) => c.section === section).length} comparisons`,
  )
  const summary = [
    `old=${OLD_URL} new=${NEW_URL} writes=${WRITES} gamePassword=${GAME_PASSWORD ? 'set' : 'unset'}`,
    `${comparisons.length} comparisons, ${differing.length} with differences, ${accepted.length} accepted, ${screenshotDiffs.length} with non-identical screenshots`,
    ...sections,
    '',
    '== differences',
    ...differing.flatMap((c) => [`[${c.section}] ${c.label} ${c.path}`, ...c.differences.map((d) => `  ${d}`)]),
    '',
    '== accepted differences (README.md)',
    ...accepted.flatMap((c) => [`[${c.section}] ${c.label} ${c.path}`, `  accepted: ${c.accepted}`, ...c.differences.map((d) => `  ${d}`)]),
    '',
    '== screenshots not byte-identical (review by eye)',
    ...screenshotDiffs.map((c) => `[${c.section}] ${c.label} ${c.path}`),
    '',
    '== compared',
    ...comparisons.map((c) => {
      let flag = ''
      if (c.differences.length) flag = c.accepted ? '  ACCEPTED' : '  DIFFERENT'
      return `[${c.section}] ${c.label} ${c.path}${flag}`
    }),
  ]
  writeFileSync(join(OUT_DIR, 'parity-report.txt'), `${summary.join('\n')}\n`)
  writeFileSync(join(OUT_DIR, 'parity-report.json'), JSON.stringify(comparisons, null, 2))
}

test.afterAll(writeReport)

// Shared between the read tests: ids come from the old app's export.
let data: ExportData

function gamesPerPlayer(): ExportPlayer[] {
  const counts = new Map<string, number>()
  data.games.forEach((g) => g.players.forEach((p) => counts.set(p.playerName, (counts.get(p.playerName) ?? 0) + 1)))
  return [...data.players].sort((a, b) => (counts.get(b.name) ?? 0) - (counts.get(a.name) ?? 0) || a.id - b.id)
}

function missingId(ids: number[]): number {
  const taken = new Set(ids)
  let id = 1
  while (taken.has(id)) id += 1
  return id
}

test.describe.serial('parity', () => {
  test('read: export and id discovery', async ({ browser }) => {
    const pair = await openPair(browser, true)
    try {
      data = await compareExport(pair, 'read')
      await compareCsvExport(pair, 'read')
      expect(data.players.length).toBeGreaterThan(0)
      expect(data.games.length).toBeGreaterThan(0)
    } finally {
      await closePair(pair)
    }
  })

  test('read: public pages', async ({ browser }) => {
    const pair = await openPair(browser, false)
    try {
      const section = 'read'
      await compare(pair, section, 'home', '/')
      await compare(pair, section, 'players list', '/players')

      // Games list: every page at every page size, then filters.
      await compare(pair, section, 'games', '/games')
      for (const pageSize of [20, 50, 100]) {
        const pages = Math.ceil(data.games.length / pageSize)
        for (let page = 1; page <= pages; page += 1) {
          await compare(pair, section, `games page ${page}/${pages}`, `/games?page=${page}&pageSize=${pageSize}`)
        }
      }
      await compare(pair, section, 'games page past the end', '/games?page=999&pageSize=20')

      const byTime = [...data.games].sort((a, b) => a.playedAt.localeCompare(b.playedAt))
      // Bounds exactly equal to real played_at values: both ends are inclusive.
      const from = encodeURIComponent(byTime[Math.floor(byTime.length / 3)].playedAt)
      const to = encodeURIComponent(byTime[Math.floor((byTime.length * 2) / 3)].playedAt)
      const lastPlayed = encodeURIComponent(byTime[byTime.length - 1].playedAt)
      const firstPlayed = encodeURIComponent(byTime[0].playedAt)
      const [a, b, c] = gamesPerPlayer()
      const gamesFilters: [string, string][] = [
        ['date range', `from=${from}&to=${to}`],
        ['from only', `from=${from}`],
        ['to only', `to=${to}`],
        ['to = last game', `to=${lastPlayed}`],
        ['from = first game', `from=${firstPlayed}`],
        ['single player', `player=${a.id}`],
        ['single player page 2', `page=2&pageSize=20&player=${a.id}`],
        ['two players', `player=${a.id}-${b.id}`],
        ['three players', `player=${a.id}-${b.id}-${c.id}`],
        ['player + date range', `player=${a.id}&from=${from}&to=${to}`],
        ['two players + date range', `player=${a.id}-${b.id}&from=${from}&to=${to}`],
        ['unknown player', `player=${missingId(data.players.map((p) => p.id))}`],
      ]
      for (const [label, query] of gamesFilters) {
        // The filter UI always writes page and pageSize first.
        const url = query.startsWith('page=') ? `/games?${query}` : `/games?page=1&pageSize=20&${query}`
        await compare(pair, section, `games ${label}`, url)
      }

      // Stats: unfiltered and player subsets in the delimited form.
      const ids = data.players.map((p) => p.id).sort((x, y) => x - y)
      const premium = data.players.filter((p) => p.tier === 'premium').map((p) => p.id)
      const standard = data.players.filter((p) => p.tier === 'standard').map((p) => p.id)
      const statsFilters: [string, string][] = [
        ['all', ''],
        ['none', '?player=none'],
        ['single player', `?player=${a.id}`],
        ['least active player', `?player=${gamesPerPlayer().at(-1)?.id}`],
        ['two players', `?player=${a.id}-${b.id}`],
        ['three players', `?player=${a.id}-${b.id}-${c.id}`],
        ['all but one', `?player=${ids.filter((id) => id !== a.id).join('-')}`],
        ['premium only', `?player=${premium.join('-') || 'none'}`],
        ['standard only', `?player=${standard.join('-') || 'none'}`],
      ]
      for (const [label, query] of statsFilters) {
        await compare(pair, section, `stats ${label}`, `/stats${query}`)
      }

      for (const player of data.players) {
        await compare(pair, section, `player ${player.name}`, `/players/${player.id}`)
      }
      await compare(pair, section, 'player missing id', `/players/${missingId(ids)}`)
      await compare(pair, section, 'player non-numeric id', '/players/abc')

      await compare(pair, section, 'admin redirects to login', '/admin', { allowRedirect: true })
      await compare(pair, section, 'admin login', '/admin/login')
    } finally {
      await closePair(pair)
    }
  })

  test('read: admin pages', async ({ browser }) => {
    const pair = await openPair(browser, true)
    try {
      const section = 'read'
      await compare(pair, section, 'admin home', '/admin')
      await compare(pair, section, 'admin games', '/admin/games')
      await compare(pair, section, 'admin players', '/admin/players')
      await compare(pair, section, 'admin settings', '/admin/settings')
      await compare(pair, section, 'admin audit', '/admin/audit')
      for (const game of data.games) {
        await compare(pair, section, `edit game ${game.id}`, `/admin/games/${game.id}/edit`)
      }
      await compare(pair, section, 'edit missing game', `/admin/games/${missingId(data.games.map((g) => g.id))}/edit`)
    } finally {
      await closePair(pair)
    }
  })

  test('write: same actions on both apps', async ({ browser }) => {
    test.skip(!WRITES, 'set PARITY_WRITES=1 to run the write section')

    // Everything this run writes is stamped at or after this instant.
    const runStart = new Date(Date.now() - 1000).toISOString()
    const section = 'write'
    const [a, b] = gamesPerPlayer()
    const notes = 'Parity game'
    const editedNotes = 'Parity game edited'
    const newPlayer = 'Parity Player'
    const renamedPlayer = 'Parity Player Renamed'
    // A fixed time before the run starts, so both apps store the same value.
    const playedAtLocal = new Intl.DateTimeFormat('sv-SE', {
      timeZone: CONTEXT_OPTIONS.timezoneId,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
      .format(new Date(Date.now() - 10 * 60_000))
      .replace(' ', 'T')

    const pair = await openPair(browser, false)
    const sides = [pair.old, pair.new]
    const each = (action: (side: Side) => Promise<void>) => Promise.all(sides.map(action))
    const checkAll = async (step: string, extra: string[] = []) => {
      for (const path of ['/', '/games', '/stats', '/players', '/admin/games', '/admin/players', '/admin/audit', '/admin/settings', ...extra]) {
        await compare(pair, section, `${step}: ${path}`, path, { maskFrom: runStart })
      }
      await compareExport(pair, section, runStart)
    }
    const deleteButtonNear = (locator: Locator) =>
      locator
        .locator('xpath=ancestor::*[.//button[normalize-space()="Delete"]][1]')
        .getByRole('button', { name: 'Delete' })
    const acceptNextDialog = (page: Page) => page.once('dialog', (dialog) => dialog.accept())

    try {
      // 1. Admin login through the form (records admin.login).
      await each(async ({ page, base }) => {
        await page.goto(`${base}/admin/login`)
        await page.getByLabel('Password').fill(ADMIN_PASSWORD)
        await page.getByRole('button', { name: 'Enter' }).click()
        await expect(page.getByRole('heading', { name: 'Command Deck' })).toBeVisible()
      })
      await compare(pair, section, 'after login', null, { maskFrom: runStart })
      await checkAll('login')

      let gameId: number | undefined
      if (GAME_PASSWORD) {
        // 2. Set a known game password through /admin/settings.
        await each(async ({ page, base }) => {
          await page.goto(`${base}/admin/settings`)
          const field = page.locator('#new-game-password')
          await field.fill(GAME_PASSWORD)
          await field.locator('xpath=ancestor::form[1]').getByRole('button', { name: 'Save' }).click()
          await page.waitForLoadState('networkidle')
        })
        await compare(pair, section, 'after setting game password', null, { maskFrom: runStart })
        await checkAll('game password set')

        // 3. Unlock and create a game from the home modal.
        await each(async ({ page, base }) => {
          await page.goto(`${base}/`)
          await page.getByRole('button', { name: '+ New Game' }).click()
          const dialog = page.locator('dialog')
          await dialog.locator('#game-password').fill(GAME_PASSWORD)
          await dialog.getByRole('button', { name: 'Unlock' }).click()
          await dialog.locator('#played_at').fill(playedAtLocal)
          for (const [row, player, score] of [[0, a, '10'], [1, b, '8']] as const) {
            const picker = dialog.getByRole('combobox', { name: 'Player' }).nth(row)
            await picker.click()
            await picker.fill(player.name)
            const listbox = await picker.getAttribute('aria-controls')
            await dialog.locator(`#${listbox}`).getByRole('option', { name: player.name, exact: true }).click()
            await dialog.getByLabel('Score').nth(row).selectOption(score)
          }
          await dialog.getByLabel('Notes').fill(notes)
          await dialog.getByRole('button', { name: 'Save Game' }).click()
          await expect(page.locator('article').first()).toContainText(notes)
        })
        await compare(pair, section, 'after creating a game', null, { maskFrom: runStart })
        const created = await compareExport(pair, section, runStart)
        gameId = created.games.find((g) => g.notes === notes)?.id
        expect(gameId, 'created game id').toBeDefined()
        await checkAll('game created', [`/players/${a.id}`, `/players/${b.id}`, `/admin/games/${gameId}/edit`])
      } else {
        // Without a known game password, edit and delete the latest game instead.
        gameId = [...data.games].sort((x, y) => y.id - x.id)[0].id
      }

      // 4. Edit the game.
      await each(async ({ page, base }) => {
        await page.goto(`${base}/admin/games/${gameId}/edit`)
        await page.getByLabel('Score').nth(0).selectOption('12')
        await page.getByLabel('Notes').fill(editedNotes)
        await Promise.all([
          page.waitForURL(/\/admin\/games$/),
          page.getByRole('button', { name: 'Save Changes' }).click(),
        ])
      })
      await compare(pair, section, 'after editing the game', null, { maskFrom: runStart })
      await checkAll('game edited', [`/players/${a.id}`, `/admin/games/${gameId}/edit`])

      // 5. Delete the game.
      await each(async ({ page, base }) => {
        await page.goto(`${base}/admin/games`)
        acceptNextDialog(page)
        await deleteButtonNear(page.getByText(editedNotes, { exact: true })).click()
        await expect(page.getByText(editedNotes, { exact: true })).toHaveCount(0)
      })
      await compare(pair, section, 'after deleting the game', null, { maskFrom: runStart })
      await checkAll('game deleted', [`/players/${a.id}`, `/admin/games/${gameId}/edit`])

      // 6. Add, rename and delete a player.
      await each(async ({ page, base }) => {
        await page.goto(`${base}/admin/players`)
        await page.getByLabel('Name').fill(newPlayer)
        await page.getByRole('button', { name: 'Add' }).click()
        await expect(page.locator(`input[value="${newPlayer}"]`)).toBeVisible()
      })
      await compare(pair, section, 'after adding a player', null, { maskFrom: runStart })
      const withPlayer = await compareExport(pair, section, runStart)
      const playerId = withPlayer.players.find((p) => p.name === newPlayer)?.id
      expect(playerId, 'new player id').toBeDefined()
      await checkAll('player added', [`/players/${playerId}`])

      await each(async ({ page, base }) => {
        await page.goto(`${base}/admin/players`)
        const input = page.locator(`input[value="${newPlayer}"]`)
        const save = input.locator('xpath=ancestor::form[1]').getByRole('button', { name: 'Save' })
        await input.fill(renamedPlayer)
        await save.click()
        await expect(page.locator(`input[value="${renamedPlayer}"]`)).toBeVisible()
      })
      await compare(pair, section, 'after renaming the player', null, { maskFrom: runStart })
      await checkAll('player renamed', [`/players/${playerId}`])

      await each(async ({ page, base }) => {
        await page.goto(`${base}/admin/players`)
        acceptNextDialog(page)
        await deleteButtonNear(page.locator(`input[value="${renamedPlayer}"]`)).click()
        await expect(page.locator(`input[value="${renamedPlayer}"]`)).toHaveCount(0)
      })
      await compare(pair, section, 'after deleting the player', null, { maskFrom: runStart })
      await checkAll('player deleted', [`/players/${playerId}`])

      // 7. Failing writes last: Postgres burns a sequence value on a failed
      // insert and SQLite does not, so ids created after this would differ
      // (accepted; nothing is created after this point).
      await each(async ({ page, base }) => {
        await page.goto(`${base}/admin/players`)
        await page.getByLabel('Name').fill(a.name)
        await page.getByRole('button', { name: 'Add' }).click()
        // No assertion on the message: the comparison below records what each
        // app shows, including an error page.
        await page.waitForLoadState('networkidle')
      })
      const duplicate = await compare(pair, section, 'duplicate name error', null, { maskFrom: runStart })
      expect(duplicate.new.lines, 'new app shows the duplicate-name message').toContain(
        'A player with that name already exists.',
      )
      // Accepted difference 2 (README): on production data the old app cannot
      // recognise the duplicate (its unique constraint is players_name_key, the
      // old code matched players_name_unique) and shows a server error page.
      if (
        duplicate.comparison.differences.length > 0 &&
        duplicate.old.lines.some((line) => line.includes('A server error occurred'))
      ) {
        duplicate.comparison.accepted =
          'old app shows a server error for a duplicate name on a database whose constraint is players_name_key; new app shows the intended message (owner, 2026-11-12)'
      }

      await each(async ({ page, base }) => {
        await page.goto(`${base}/admin/players`)
        acceptNextDialog(page)
        await deleteButtonNear(page.locator(`input[value="${a.name}"]`)).click()
        await page.waitForLoadState('networkidle')
      })
      await compare(pair, section, 'player in use error', null, { maskFrom: runStart })
      await checkAll('after failed writes')
    } finally {
      await closePair(pair)
    }
  })

  test('zero differences', () => {
    expect(comparisons.length).toBeGreaterThan(0)
    const differing = comparisons
      .filter((c) => c.differences.length > 0 && !c.accepted)
      .map((c) => `[${c.section}] ${c.label} ${c.path}`)
    expect(differing, 'details in test-results/parity/parity-report.txt').toEqual([])
  })
})
