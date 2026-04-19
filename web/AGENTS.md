<!-- BEGIN:nextjs-agent-rules -->
# HarborStats Agent Guide

## Critical Framework Note
This app uses **Next.js 16.2.4** + **React 19.2.4** and may differ from older framework patterns.

Before changing framework-level behavior, read the relevant docs in:
- `node_modules/next/dist/docs/`

Always heed deprecation warnings from Next.js 16.

## Tech Stack (Current)
- Next.js 16 App Router (`app/`)
- React 19 + TypeScript (strict mode)
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- PostgreSQL 18
- Drizzle ORM + Drizzle Kit
- `postgres` driver
- ESLint 9 + `eslint-config-airbnb-extended` + `eslint-plugin-better-tailwindcss`
- Prettier 3
- Package manager: `pnpm`

## Project Layout
- `app/`: routes, layouts, server actions, admin pages
- `components/`: shared client components (`GameForm`, `PlayerRow`, `Stepper`, etc.)
- `lib/`: DB + domain logic (`games`, `players`, `admin-auth`, date helpers)
- `db/`: Drizzle schema and SQL migrations
- `scripts/`: migration, seed, and baseline scripts
- `proxy.ts`: admin route protection (`/admin/:path*`)
- `devops/`: production-ish compose and deploy script (repo root)

## Core App Patterns
1. Prefer **Server Components** for pages/data fetching.
2. Use `'use client'` only for interactive UI.
3. Keep mutation logic in **Server Actions** (`app/**/actions.ts`) and data logic in `lib/`.
4. Use `Promise.all` for independent parallel data fetches on server pages.
5. Preserve existing form contracts:
   - `played_at`, `notes`
   - `player_id_<row>`, `score_<row>`, `is_winner_<row>`
6. Keep `parseGameFormData` behavior intact unless intentionally changing product rules:
   - If no explicit winner and one unique highest score exists, mark that player as winner.
7. Public/admin list pages currently use `export const dynamic = 'force-dynamic'`; keep this unless caching strategy is intentionally changed.

## Admin/Auth Constraints
- Admin auth is cookie-based and enforced in `proxy.ts`.
- `/admin/login` is the only bypassed admin route.
- Session cookie name: `hs_admin` (`lib/admin-auth.ts`).
- Required env vars for admin:
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
- Never log or expose these secrets.

## Data Model Constraints
Tables:
- `players` (`tier` must be `premium` or `standard`)
- `games`
- `game_players`

Rules to preserve:
- Scores are non-negative.
- `players.name` is unique.
- Deleting a player referenced by games should fail with `PlayerInUseError`.
- Deleting a game cascades to its `game_players`.

## Local Dev Commands
Run from `web/`:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm format:check
pnpm build
```

Database workflow:

```bash
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:baseline
pnpm db:studio
```

Schema change protocol:
1. Edit `db/schema.ts`
2. Run `pnpm db:generate`
3. Review generated SQL in `db/migrations/`
4. Run `pnpm db:migrate`

## Deployment Notes
- `web/Dockerfile` has `runner` and `migrator` stages.
- Root `devops/docker-compose.yml` defines services: `db`, `web`, `migrate`, `baseline`, `pgadmin`.
- Root `devops/deploy.sh` order:
  1. pull latest
  2. start db
  3. run baseline
  4. run migrations
  5. start web + pgadmin

## Code Style and Quality Expectations
- Use function declarations for named React components (matches ESLint rule).
- Keep JSX in `.tsx` files.
- Follow Prettier defaults in `.prettierrc.json` (single quotes, semicolons, trailing commas, printWidth 100).
- Respect Tailwind linting via `better-tailwindcss`; keep `app/globals.css` as design token source.
- Use `@/*` path alias.
- Avoid adding dependencies unless necessary.

## UI/UX Guardrails
- Preserve current Harbor visual language:
  - CSS vars in `app/globals.css` (`--navy-900`, `--navy-800`, `--gold`, `--cream`)
  - Cinzel font usage for key headings/buttons
- New game creation is modal-based via `components/NewGameButton.tsx` (no `/new` route currently).
- Keep admin shell/nav consistent via `app/admin/AdminShell.tsx`.

## Testing and Verification
There is currently **no automated test suite** configured.

Minimum validation after meaningful changes:
1. `pnpm lint`
2. `pnpm build`
3. Manual smoke check:
   - Create game from home modal
   - Edit/delete game in admin
   - Add/rename/delete player in admin
   - Verify admin login/logout flow

## Roadmap/Spec Awareness
- Product specs live under `docs/superpowers/specs/` (repo root).
- Treat spec docs as guidance for planned work; do not assume all spec items are implemented yet.

<!-- END:nextjs-agent-rules -->
