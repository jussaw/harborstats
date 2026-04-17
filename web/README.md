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
pnpm db:migrate  # create schema and seed players
pnpm dev         # http://localhost:3000
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/harborstats` | Postgres connection string |

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
| `pnpm db:migrate` | Run `db/schema.sql` against `DATABASE_URL` |

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4**
- **PostgreSQL 18** via Docker
- `postgres` npm package — tagged-template SQL, no ORM
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
  db.ts               Postgres client singleton
  players.ts          getPlayers()
  games.ts            createGame(), listRecentGames()
db/
  schema.sql          DDL (players, games, game_players) + seed inserts
scripts/
  migrate.ts          runs schema.sql against DATABASE_URL
```

## Database schema

Three tables with cascading deletes:

- **`players`** — id, name (unique), tier (`premium` | `standard`), created_at
- **`games`** — id, played_at, notes, submitted_from_ip, created_at
- **`game_players`** — game_id FK, player_id FK, score (≥ 0), is_winner

Players are seeded once during migration. Renaming a player updates all historical records automatically via JOIN.
