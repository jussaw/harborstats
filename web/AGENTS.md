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
- `scripts/`: migration and baseline scripts
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
   - Ties are not a supported outcome; preserve a single winning tier per recorded game.
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
pnpm db:baseline
pnpm db:studio
```

## Git / Worktree Workflow
- Use repo-local `.worktrees/` for worktrees created by any agentic AI tool working in this repo.
- `.worktrees/` is already gitignored for this repo, so treat it as the standard worktree location for agentic tooling instead of checking for alternates each time.
- Only use a different worktree location if the user explicitly asks for one.

Schema change protocol:
1. Edit `db/schema.ts`
2. Run `pnpm db:generate`
3. Review generated SQL in `db/migrations/` and make `.sql` migrations idempotent before committing them
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
Automated tests are configured and should be part of normal feature work.

When adding a new feature or making a meaningful behavior change, add or update automated tests in the narrowest matching layer. Purely cosmetic or copy-only edits can use lighter judgment, but default to coverage for anything users or domain logic can feel.

Use the existing test layout and patterns:
- `tests/unit/**`: pure server/lib/proxy/helper coverage with Vitest in the node environment
- `tests/components/**`: React component behavior with Vitest, Testing Library, and jsdom
- `tests/integration/**`: DB-backed domain logic and server-action flows using the prepared test database helpers
- `tests/e2e/**`: Playwright coverage for multi-step user journeys, navigation, auth, and cross-layer regressions

Choose the smallest layer that proves the behavior:
- Logic-only change: add/update a unit test near similar coverage such as `tests/unit/lib/*.test.ts`
- Interactive UI change: add/update a component test such as `tests/components/*.test.tsx`
- Persistence/query/server-action change: add/update an integration test such as `tests/integration/*.test.ts`
- Full workflow regression spanning multiple layers: add/update an e2e spec such as `tests/e2e/*.spec.ts`

Follow the current test style instead of inventing new conventions:
- Use focused `describe`/`it` scenarios
- Use `vi.mock`, `vi.stubEnv`, and fake timers where appropriate in unit tests
- Use Testing Library helpers such as `render`, `screen`, `waitFor`, and `userEvent` for component tests
- Reuse shared DB helpers such as `createTestPlayer`, `createTestGame`, and the prepared integration DB flow instead of bespoke setup
- Keep tests grouped by domain under the existing `tests/` folders rather than creating a new test layout

Minimum validation after meaningful changes:
1. `pnpm test`
2. `pnpm lint`
3. `pnpm build`
4. Run targeted suites when relevant:
   - `pnpm test:unit`
   - `pnpm test:components`
   - `pnpm test:integration`
   - `pnpm test:e2e`
5. Manual smoke check when the change touches the corresponding flows:
   - Create game from home modal
   - Edit/delete game in admin
   - Add/rename/delete player in admin
   - Verify admin login/logout flow

## Roadmap/Spec Awareness
- Product specs live under `docs/superpowers/specs/` (repo root).
- Treat spec docs as guidance for planned work; do not assume all spec items are implemented yet.

<!-- END:nextjs-agent-rules -->
