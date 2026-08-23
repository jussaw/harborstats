# HarborStats

A mobile-friendly Catan game recorder for tracking [colonist.io](https://colonist.io) results among a friend group. Log players, scores, and winners after each game; browse the full history on the home feed.

## Prerequisites

- [Node.js](https://nodejs.org) 22.13 – 26.x (tested on 22 and 26; Node 25+ requires the `--no-webstorage` workaround in `vitest.components.config.ts` until vitest 5)
- [pnpm](https://pnpm.io)
- [Docker](https://www.docker.com) (for the local Postgres database)

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm db:up       # start Postgres in Docker
pnpm db:migrate  # create schema (Drizzle migrations)
pnpm dev         # http://localhost:3000
```

After startup, add players from the admin roster page at `/admin/players`.

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/harborstats` | Postgres connection string |
| `ADMIN_PASSWORD` | *(required)* | Shared password for the `/admin` panel |
| `ADMIN_SESSION_SECRET` | *(required)* | Secret key used to sign admin session cookies — rotate to invalidate all sessions |
| `ADMIN_SESSION_VERSION` | `1` | Optional; bumping or changing it invalidates all existing admin sessions without rotating `ADMIN_SESSION_SECRET` |

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm db:up` | Start the Postgres Docker container |
| `pnpm db:generate` | Generate a new SQL migration from schema changes in `db/schema.ts` |
| `pnpm db:migrate` | Apply pending migrations to `DATABASE_URL` |
| `pnpm db:baseline` | **One-time** — marks the initial migration as applied on an existing DB that already has the schema (run before first `db:migrate` on a pre-existing database) |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |

## Testing

| Command                 | Scope                                                                          |
| ----------------------- | ------------------------------------------------------------------------------ |
| `pnpm test`             | Alias for `pnpm test:fast` — fast unit + component tests only; **no database** |
| `pnpm test:unit`        | Unit tests (pure server/lib/helper logic)                                      |
| `pnpm test:components`  | Component tests (UI behavior in jsdom)                                         |
| `pnpm test:integration` | DB-backed integration tests                                                    |
| `pnpm test:e2e:install` | Install the Playwright Chromium browser (first-time setup)                     |
| `pnpm test:e2e`         | Playwright end-to-end tests                                                    |
| `pnpm test:all`         | Fast + integration + e2e                                                       |
| `pnpm test:ci`          | Production build, then fast + integration + e2e                                |

Prerequisites:

- `pnpm test` (fast unit + component tests) needs no database and no extra setup.
- `pnpm test:integration` and `pnpm test:e2e` auto-run the test-DB prepare step, but require the local Postgres container to be running first (`pnpm db:up`). `pnpm test:all` and `pnpm test:ci` include these DB-backed suites.
- `pnpm test:e2e` also needs the Playwright Chromium browser, installed once via `pnpm test:e2e:install`.

## Adding a schema change

1. Edit `db/schema.ts`
2. `pnpm db:generate` — produces a new SQL migration in `db/migrations/`
3. Review the generated SQL
4. `pnpm db:migrate` — applies it

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **PostgreSQL 18** via Docker
- **Drizzle ORM** — type-safe query builder
- **Drizzle Kit** — schema migrations
- `postgres` npm package — underlying PostgreSQL driver
- Next.js server actions for form handling

## Project structure

```
app/
  page.tsx                  home feed
  games/page.tsx            games index
  players/page.tsx          player index
  players/[id]/page.tsx     player detail page
  stats/page.tsx            stats dashboard
  admin/                    admin pages for login, players, games, and settings, plus protected audit history at /admin/audit and authenticated CSV/JSON export at /admin/export
  actions.ts                server actions shared by app routes
  layout.tsx                root layout and app shell
  globals.css               theme and global styles
components/
  GameForm.tsx              create/edit game form
  Games*.tsx                games list filters and pagination UI
  Player*.tsx               player UI, selectors, profile card, and modal
  *Chart.tsx                stats visualizations
  Sidebar*.tsx              navigation shell
db/
  schema.ts                 Drizzle schema
  migrations/               SQL migrations and metadata
lib/
  admin-auth.ts             admin authentication helpers
  db.ts                     Drizzle client
  games.ts                  game queries and mutations
  players.ts                player queries and mutations
  settings.ts               app settings access
  stats.ts                  stats aggregation helpers
scripts/
  baseline.ts               mark initial migration as already applied
  migrate.ts                apply pending migrations
tests/
  unit/                     unit tests
  components/               component tests
  integration/              integration tests
  e2e/                      Playwright smoke coverage
proxy.ts                    request proxy entrypoint
```

## Database schema

Five tables:

- **`players`** — roster of people; id, name (unique), tier (`premium` | `standard`), created_at
- **`games`** — one recorded game; id, played_at, notes, submitted_from_ip, created_at
- **`game_players`** — per-player result within a game; game_id FK, player_id FK, score (0–30 inclusive), is_winner
- **`app_settings`** — single-row app configuration (stat thresholds, hashed game-creation password)
- **`audit_logs`** — append-only history of state-changing actions and auth events

Deleting a game cascades to its `game_players` rows.

Players are managed directly in the admin UI. Renaming a player updates all historical records automatically via JOIN.
