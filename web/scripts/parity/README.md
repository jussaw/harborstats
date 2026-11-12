# Old-vs-new parity crawl

One-off proof for the Postgres → SQLite switchover: the same URLs and the same writes on the
old app (Postgres) and the new app (SQLite) must show the same thing. Removed with the other
switchover tooling in the cleanup PR.

## Setup

Everything runs on the Mac; nothing touches production.

```bash
# 1. Throwaway Postgres 18 with the dump restored (dump in its own folder, mounted read-only)
docker run --rm -d --name hs-parity-pg -e POSTGRES_PASSWORD=postgres -p 55432:5432 \
  -v <dump-folder>:/dump:ro postgres:18
docker exec hs-parity-pg createdb -U postgres harborstats
docker exec hs-parity-pg pg_restore -U postgres -d harborstats --no-owner --exit-on-error /dump/<file>.dump

# 2. Converted SQLite file (verify it), then give the new app a COPY of it
cd web
pnpm exec tsx scripts/pg-to-sqlite.ts --pg postgres://postgres:postgres@127.0.0.1:55432/harborstats --out <dir>/harborstats.db
pnpm exec tsx scripts/verify-migration.ts --pg postgres://postgres:postgres@127.0.0.1:55432/harborstats --sqlite <dir>/harborstats.db
cp <dir>/harborstats.db <dir>/parity.db

# 3. Old app: the last Postgres commit, in its own worktree
git worktree add --detach .worktrees/parity-old 676a981
(cd .worktrees/parity-old/web && pnpm install --frozen-lockfile && pnpm exec next build)

# 4. Both apps with the same env (TZ, NODE_ENV and admin secrets), different ports
export TZ=UTC NODE_ENV=production ADMIN_PASSWORD=… ADMIN_SESSION_SECRET=…
(cd .worktrees/parity-old/web && DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/harborstats \
  pnpm exec next start -H 127.0.0.1 -p 3201) &
(cd web && pnpm exec next build && DATABASE_PATH=<dir>/parity.db pnpm exec next start -H 127.0.0.1 -p 3202) &
```

## Run

```bash
cd web
OLD_URL=http://127.0.0.1:3201 NEW_URL=http://127.0.0.1:3202 \
ADMIN_PASSWORD=… ADMIN_SESSION_SECRET=… \
pnpm exec playwright test -c scripts/parity/playwright.parity.config.ts
```

| Variable | Required | Meaning |
| --- | --- | --- |
| `OLD_URL`, `NEW_URL` | yes | The two running apps. |
| `ADMIN_PASSWORD` | yes | Same value both apps run with; the write section logs in with it. |
| `ADMIN_SESSION_SECRET` | yes | Same value both apps run with; the read section signs its own `hs_admin` cookie with it. |
| `ADMIN_SESSION_VERSION` | no | Only if the apps set it. |
| `PARITY_WRITES=1` | no | Also run the write section. It changes both databases: throwaway copies only. |
| `GAME_PASSWORD` | no | With writes: set on both apps through `/admin/settings`, then used to unlock and create a game from the home modal. Unset: the create step is skipped and edit/delete use the latest existing game. |

Exit 0 only with zero unaccepted differences. Results land in `web/test-results/parity/`
(cleaned at the start of each run): `parity-report.txt` (summary, every difference, every URL
compared), `parity-report.json`, and `screens/NNNN-<url>.old.png` / `.new.png`.

**The read section writes nothing.** It never uses the login form (that records an
`admin.login` audit row); it signs the admin cookie itself. Even so, point the new app at a copy
of the converted file, never at the file that will be deployed.

## What is compared

For every URL, on both apps: HTTP status, final path (an unexpected redirect is a difference, so
a lost session cannot make two login pages match), page title, the body's visible text line by
line, a structural signature (tag + text of headings, table cells, `article`s, list items,
`dt`/`dd`, alerts and status regions), every form control's value (inputs, selected options,
textareas, checkbox state) and every link target.

**Read section:** `/`, `/players`, `/games` (bare, every page at page sizes 20, 50 and 100, past
the last page, and 12 filter combinations: date range with both bounds equal to real
`played_at` values, from only, to only, to = last game, from = first game, one/two/three
players, player on page 2, player + dates, two players + dates, unknown player id), `/stats`
(all, `none`, one player, least active player, two, three, all but one, premium only, standard
only), every player profile, a missing and a non-numeric player id, `/admin` and `/admin/login`
signed out, and signed in: `/admin`, `/admin/games`, `/admin/players`, `/admin/settings`,
`/admin/audit`, every game's edit page, a missing game's edit page, and both exports (JSON
parsed and compared structurally; CSV line by line, plus status and headers).

**Write section** (same steps on both apps, in this order; after each one the pages each side
landed on, then `/`, `/games`, `/stats`, `/players`, `/admin/games`, `/admin/players`,
`/admin/audit`, `/admin/settings`, the JSON export and the affected player/game pages): admin
login through the form; set the game password; unlock and create a game from the home modal;
edit it; delete it; add a player; rename it; delete it; then the failing writes last: a
duplicate name and deleting a player who has games. Postgres burns a sequence value on a failed
insert and SQLite does not, so ids created after a failing insert could differ (accepted in the
spec); nothing is created after them.

## Normalization rules

Nothing else is normalized.

1. Text: runs of whitespace collapse to one space; empty lines are dropped.
2. Hidden inputs named `$ACTION…` are ignored: Next.js server-action ids are per-build hashes.
3. Links under `/_next/` are ignored: build asset paths.
4. JSON export: `exportedAt` is ignored: it is the request time.
5. Write section only: `<time>` elements and export timestamps at or after the run's start show
   `<during run>`. Rows the run creates are stamped by each app's own clock, seconds apart.
   The created game's `played_at` is fixed before the run starts, so it is compared.
6. Screenshots are evidence, not the gate. Pairs that are not byte-identical are listed in the
   report for review by eye. Seen so far: rendering noise of at most 6/255 on a few pixels with
   identical DOM and SVG markup.

## Accepted differences (owner, 2026-11-12)

1. **Total Wins ties.** Rows tied on every Total Wins column but the name are compared in name
   order. The old app left them in Postgres' hash-aggregate order (not reproducible); the new app
   orders them by name, case-insensitively, then id (`fix(stats): break total wins ties by name`).
2. **Duplicate player name on production data.** The production Postgres names the unique
   constraint `players_name_key`; the old code only recognised `players_name_unique`, so the old
   app shows a server error page. The new app shows "A player with that name already exists."
   The crawl requires the new app to show that message, and accepts the difference only when the
   old app shows the server error page.
