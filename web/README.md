# HarborStats

A mobile-friendly Catan game recorder for tracking [colonist.io](https://colonist.io) results among a friend group. Log players, scores, and winners after each game; browse the full history on the home feed.

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io)
- [Docker](https://www.docker.com) (for the local Postgres database)

## Quick start

```bash
cp .env.example .env
pnpm install
pnpm db:up       # start Postgres in Docker
pnpm db:migrate  # create schema (Drizzle migrations)
pnpm db:seed     # seed player roster
pnpm dev         # http://localhost:3000
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/harborstats` | Postgres connection string |
| `ADMIN_PASSWORD` | *(required)* | Shared password for the `/admin` panel |
| `ADMIN_SESSION_SECRET` | *(required)* | Secret key used to sign admin session cookies — rotate to invalidate all sessions |

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
| `pnpm db:seed` | Seed the player roster (idempotent, safe to re-run) |
| `pnpm db:baseline` | **One-time** — marks the initial migration as applied on an existing DB that already has the schema (run before first `db:migrate` on a pre-existing database) |
| `pnpm db:studio` | Open Drizzle Studio (visual DB browser) |

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
  layout.tsx          root layout (Cinzel font, harbor hex background)
  page.tsx            home — recent game feed
  globals.css         CSS custom properties and theme
  actions.ts          server actions
  new/
    page.tsx          new game form page
    NewGameForm.tsx   client component (8 player rows, datetime, notes)
components/
  PlayerRow.tsx       player select + score stepper + winner toggle
  Stepper.tsx         +/- score input with press-and-hold acceleration
lib/
  db.ts               Drizzle client (wraps postgres.js singleton)
  players.ts          getPlayers(), listPlayersWithUsage(), etc.
  games.ts            createGame(), listRecentGames(), etc.
db/
  schema.ts           Drizzle schema (players, games, game_players)
  migrations/         SQL migration files managed by Drizzle Kit
scripts/
  migrate.ts          applies pending migrations via Drizzle migrator
  seed.ts             seeds the player roster
  baseline.ts         one-time: marks initial migration applied on existing DBs
```

## Database schema

Three tables with cascading deletes:

- **`players`** — id, name (unique), tier (`premium` | `standard`), created_at
- **`games`** — id, played_at, notes, submitted_from_ip, created_at
- **`game_players`** — game_id FK, player_id FK, score (≥ 0), is_winner

Players are seeded once via `pnpm db:seed`. Renaming a player updates all historical records automatically via JOIN.
