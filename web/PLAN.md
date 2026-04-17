# HarborStats — Catan / colonist.io game recorder

## Context

A small web app for a friend group to log the results of their online Catan (colonist.io) games and see a running history. The group wants a fast, mobile-friendly way to pick who played, set each score, mark the winner, and save — then see a feed of past games.

This plan is the output of a brainstorming session that locked in UX, data model, and a "Harbor Hex" visual theme (navy + Catan-wheat gold, Cinzel serif, outline-only pointy-top honeycomb background). The codebase is a fresh Next.js 16 + React 19 + Tailwind v4 scaffold with nothing built yet.

> **Important (from AGENTS.md):** "This is NOT the Next.js you know — this version has breaking changes." After `pnpm install`, the implementation MUST consult `node_modules/next/dist/docs/` for the current App Router, layout, and server-action / form APIs before writing code. Heed any deprecation notices.

## Decisions locked during brainstorming

1. **Players:** stored in a `players` DB table so they can be renamed without affecting history. The initial list is seeded during migration. Two tiers rendered as `<optgroup>`:
   - **Premium** (alphabetized): Player Alpha, Player Bravo, Player Charlie, Player Delta, Player Echo, Player Foxtrot
   - **Standard** (alphabetized): Player Golf, Player Hotel
2. **Rows:** 8 player rows always rendered. Any number may be submitted. Rule: within a row, name and score are both-or-neither — filling one requires the other.
3. **Score control:** stepper (− / editable number input / +) with press-and-hold acceleration, `min=0`, **no upper limit**, user may type directly into the number.
4. **Winner:** explicit star toggle per row (not inferred from highest score). Multiple winners allowed.
5. **Game metadata:** `played_at` datetime (auto-filled to current date + time, editable) + free-text `notes`. Time is recorded because multiple games can be played in a single day.
6. **Storage:** Postgres 18 in a local Docker container.
7. **Theme:** "Harbor Hex" — navy `#0e3a4a` / `#0a2130`, Catan-wheat gold `#e8b23a`, cream `#f4ecd4`, Cinzel serif for display type.
8. **Background pattern:** outline-only pointy-top honeycomb tessellation. Tile is `24.2487 × 42` px, hex radius `14`, stroke `%23e8b23a` at opacity `0.30`.

## Tech stack

- **Framework:** Next.js 16.2.4 (App Router only — no `pages/`) + React 19
- **Styling:** Tailwind CSS v4 (already configured via `@tailwindcss/postcss`)
- **Language:** TypeScript strict mode (already enabled in `tsconfig.json`)
- **DB:** Postgres 18 via Docker
- **DB client:** `postgres` npm package (lightweight, tagged-template SQL, no ORM needed at this scale)
- **Forms:** native React state + Next.js server actions

## Data model

Every table has a surrogate `id` primary key. Players are stored in their own table and referenced by ID so renaming a player requires only one `UPDATE players SET name = $1 WHERE id = $2` — all historical game records automatically reflect the new name via JOIN.

```sql
CREATE TABLE IF NOT EXISTS players (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  tier        TEXT NOT NULL CHECK (tier IN ('premium', 'standard')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id                SERIAL PRIMARY KEY,
  played_at         TIMESTAMPTZ NOT NULL,
  notes             TEXT NOT NULL DEFAULT '',
  submitted_from_ip INET,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_players (
  id          SERIAL PRIMARY KEY,
  game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id   INTEGER NOT NULL REFERENCES players(id),
  score       INTEGER NOT NULL CHECK (score >= 0),
  is_winner   BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_game_players_game   ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_player ON game_players(player_id);
```

### Seed data (applied in migrate.ts after DDL)

```sql
INSERT INTO players (name, tier) VALUES
  ('Player Alpha', 'premium'),
  ('Player Bravo',   'premium'),
  ('Player Charlie',   'premium'),
  ('Player Delta',    'premium'),
  ('Player Echo',      'premium'),
  ('Player Foxtrot',  'premium'),
  ('Player Golf',     'standard'),
  ('Player Hotel',   'standard')
ON CONFLICT (name) DO NOTHING;
```

## Files to create

- `docker-compose.yml` — `postgres:18` service on port 5432, named volume `pgdata`
- `.env.example` — `DATABASE_URL=postgres://postgres:postgres@localhost:5432/harborstats`
- `db/schema.sql` — DDL + seed INSERT above
- `scripts/migrate.ts` — reads `DATABASE_URL`, runs `db/schema.sql`
- `lib/db.ts` — `postgres` client singleton
- `lib/players.ts` — `getPlayers()` queries DB; returns `{ id, name, tier }[]` sorted tier then alpha
- `lib/games.ts` — `createGame({ playedAt, notes, submittedFromIp, players: { playerId, score, isWinner }[] })` and `listRecentGames(limit)`
- `app/actions.ts` — `'use server'`; `createGameAction(formData)`; reads client IP from `x-forwarded-for` → `x-real-ip` → `null` using `headers()` from `next/headers`
- `app/new/page.tsx` — server component; fetches `getPlayers()`, renders `<NewGameForm players={...} />`
- `app/new/NewGameForm.tsx` — `'use client'`; 8 rows + datetime-local + notes + submit
- `components/Stepper.tsx` — `'use client'`; − / number-input / + with hold-to-accelerate
- `components/PlayerRow.tsx` — `'use client'`; player `<select>` (by id) + Stepper + winner star

## Files to modify

- `app/page.tsx` — replace CNA template with recent-games list + "New Game" CTA
- `app/layout.tsx` — apply `.harbor-bg` to body, wire Cinzel font
- `app/globals.css` — add theme tokens, Cinzel font, `.harbor-bg` class with the exact honeycomb SVG
- `package.json` — add `postgres` dep, add scripts: `db:up` (`docker compose up -d`), `db:migrate` (`tsx scripts/migrate.ts`)
- `.gitignore` — add `.env.local`, `.superpowers/`

## Honeycomb CSS (exact)

```css
.harbor-bg {
  background-color: #0e3a4a;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24.2487' height='42' viewBox='0 0 24.2487 42'><g fill='none' stroke='%23e8b23a' stroke-opacity='0.30' stroke-width='0.9' stroke-linecap='square' stroke-linejoin='miter'><polygon points='12.1244,0 24.2487,7 24.2487,21 12.1244,28 0,21 0,7'/><polyline points='0,21 12.1244,28 12.1244,42'/><polyline points='24.2487,21 12.1244,28'/></g></svg>");
  background-size: 24.2487px 42px;
  background-repeat: repeat;
}
```

## Implementation — subagent dispatch plan

Phase 0 is sequential. Phase 1 dispatches three agents in parallel. Phase 2 is sequential.

### Phase 0 — setup (main agent, sequential)

1. `pnpm install` so `node_modules/next/dist/docs/` is populated.
2. Read the relevant Next.js 16 guides in `node_modules/next/dist/docs/` — especially App Router, layouts, server actions, `<form action>` wiring, and `next/font`. Note any breakage vs. typical Next.js knowledge before dispatching subagents.
3. Create a stub `.env.local` with `DATABASE_URL=postgres://postgres:postgres@localhost:5432/harborstats`.

### Phase 1 — three subagents in parallel

**Agent A — Infra & persistence**

- Creates: `docker-compose.yml`, `.env.example`, `db/schema.sql`, `scripts/migrate.ts`, `lib/db.ts`, `lib/players.ts`, `lib/games.ts`
- Modifies: `package.json` (add `postgres` + `tsx` dep, add `db:up` + `db:migrate` scripts), `.gitignore`
- `createGame` accepts `{ playedAt, notes, submittedFromIp: string | null, players: { playerId, score, isWinner }[] }` and inserts into `games` + `game_players` in a single transaction
- `listRecentGames(limit = 20)` JOINs `game_players` → `players` so returned records include `playerName`
- `getPlayers()` returns `{ id, name, tier }[]` ordered by tier (`premium` first), then name
- **Done when:** `pnpm db:up && pnpm db:migrate` applies schema + seeds players; `createGame` / `listRecentGames` / `getPlayers` are callable and typed

**Agent B — Theme foundation**

- Modifies: `app/globals.css`, `app/layout.tsx`
- Adds CSS custom props: `--navy-900: #0a2130`, `--navy-800: #0e3a4a`, `--gold: #e8b23a`, `--cream: #f4ecd4`
- Loads Cinzel via `next/font/google` (verify API in the Next.js 16 docs) and applies to headings
- Adds `.harbor-bg` class with the exact SVG above; body gets harbor-bg + subtle radial-gradient overlay
- **Done when:** an empty page shows navy background, crisp tessellating gold honeycomb, and Cinzel renders for `h1`/`h2`

**Agent C — UI primitives**

- Creates: `components/Stepper.tsx`, `components/PlayerRow.tsx`
- `Stepper` props: `value: number`, `onChange(v: number)`, `min?: number = 0` (no max); press-and-hold: 350 ms delay → 90 ms repeat; spin buttons hidden; clamps on blur
- `PlayerRow` props: `value: { playerId: number | null; score: number | null; isWinner: boolean }`, `onChange`, `players: { id: number; name: string; tier: string }[]`; renders player `<select>` with `<optgroup>` Premium/Standard (value = player id), Stepper, and star toggle
- **Done when:** both components can be mounted and interacted with without DB

### Phase 2 — wire it up (main agent, sequential)

- Creates: `app/actions.ts`, `app/new/page.tsx`, `app/new/NewGameForm.tsx`
- Modifies: `app/page.tsx`
- `app/new/page.tsx` calls `getPlayers()` server-side and passes the list to `<NewGameForm>`
- `NewGameForm` owns 8 row states + datetime-local (auto-filled to now) + notes; validates name-and-score-both-or-neither; calls `createGameAction` which calls `createGame`
- `app/page.tsx` calls `listRecentGames()` server-side; renders list with date+time, winner(s) in gold, player names (from JOIN), scores, notes
- Use Next.js 16's form-action API exactly as documented in the bundled docs

## Verification (end-to-end)

1. `docker compose up -d` — Postgres container healthy
2. `pnpm install && pnpm db:migrate` — schema applied, 8 players seeded
3. `pnpm dev` → http://localhost:3000 — navy background, outline honeycomb, "New Game" button visible
4. Click "New Game" → 8 rows render, current date+time pre-filled, all 8 players available in dropdowns
5. Fill 4 rows with distinct players + scores, mark one winner, leave 4 empty, submit — redirects to home
6. Home shows the game with correct date+time, winner highlighted in gold, all scores, player names
7. Submit a row with name but no score (or vice versa) — form blocks with a clear message
8. Restart `pnpm dev` + `docker compose restart` — game still present (persistence confirmed)
9. `UPDATE players SET name = 'J' WHERE name = 'Player Bravo'` in psql — game history shows updated name without any other data changes
10. DevTools at 375 px — steppers tappable, rows readable, honeycomb tessellates cleanly
