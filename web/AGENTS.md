# HarborStats Web App Guide

## Framework Docs

Next.js ships its docs inside the installed package. Before changing framework-level behavior
(routing, caching, server actions), read the relevant page in `node_modules/next/dist/docs/` —
the local copy matches the installed version and beats stale training data. Heed deprecation
warnings from Next.js.

## Project Layout

- `app/`: routes, layouts, server actions, admin pages
- `components/`: shared client components (`GameForm`, `PlayerRow`, `NewGameButton`, etc.); shared
  primitives in `components/ui/`
- `lib/`: DB + domain logic (`games`, `players`, `admin-auth`, `game-auth`, date helpers)
- `db/`: Drizzle schema and SQL migrations
- `scripts/`: one-off scripts (`migrate.ts`, `baseline.ts`, `generate-pwa-icons.ts`)
- `proxy.ts`: admin route protection (`/admin/:path*`)

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
7. Public/admin list pages currently use `export const dynamic = 'force-dynamic'`; keep this
   unless caching strategy is intentionally changed.

## Admin/Auth Constraints

- Admin auth is cookie-based and enforced in `proxy.ts`.
- `/admin/login` is the only bypassed admin route.
- Session cookie name: `hs_admin` (`lib/admin-auth.ts`).
- Required env vars for admin:
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `ADMIN_SESSION_VERSION` (optional, defaults to `1`; bump to invalidate all admin sessions
    without rotating `ADMIN_SESSION_SECRET`)
- Never log or expose these secrets.
- `createGameAction` is gated by the `hs_game` cookie (`lib/game-auth.ts`, signed with
  `ADMIN_SESSION_SECRET`); game creation password is stored as a salted scrypt hash in
  `app_settings.new_game_password_hash` and is editable at `/admin/settings`.

## Data Model Constraints

Tables: `players`, `games`, `game_players`, `app_settings`, `audit_logs`.

Rules to preserve:

- Scores are 0–30 inclusive. The DB check `game_players_score_check` (`db/schema.ts`) mirrors
  `MAX_SCORE` in `lib/games.ts` — change both together.
- `players.tier` must be `premium` or `standard` (DB check).
- `players.name` is unique.
- Deleting a player referenced by games must fail with `PlayerInUseError`.
- Deleting a game cascades to its `game_players`.

## Audit Requirements

Every state-changing Server Action MUST record an audit entry via `recordAudit()` (`lib/audit.ts`).
This covers all create/update/delete of games, players, and settings, plus auth events (admin
login/logout, game unlock) including **failed** sign-in and unlock attempts — the history is
browsable at `/admin/audit`. Record failed attempts only past the rate-limit gate so a brute-force
attacker can't inflate the audit table; do not record throttled (rate-limited) requests.

When you add a new action:

- Call `recordAudit({ action, actorType, entityType, entityId, summary, metadata })` at the action
  layer (`app/**/actions.ts`), **after the mutation succeeds and before any `redirect()`** (Next's
  `redirect()` throws, so a call after it never runs).
- Name actions `<entity>.<verb>` (e.g. `player.create`, `game.delete`). `actorType` is `admin`,
  `game`, or `anonymous` (DB check `audit_logs_actor_type_check`).
- The actor IP is resolved inside `recordAudit` from request headers — do not pass it.
- Never put secrets (passwords, hashes, session tokens) in `summary` or `metadata`.
- Audit writes are best-effort: a failure is logged and swallowed so it can never break the action.
  Do not wrap the user's action in the success of the audit write.

## Commands

Run everything from `web/` with `pnpm`.

```bash
pnpm install
pnpm dev
pnpm lint
pnpm format:check
pnpm build
```

Database workflow (local dev DB runs via `web/docker-compose.yml`):

```bash
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:baseline
pnpm db:studio
```

Schema change protocol:

1. Edit `db/schema.ts`
2. Run `pnpm db:generate`
3. Review generated SQL in `db/migrations/` and make `.sql` migrations idempotent before
   committing them
4. Run `pnpm db:migrate`

## Git / Worktree Workflow

- Use repo-local `.worktrees/` (already gitignored) for worktrees created by any agentic AI tool
  working in this repo. Only use a different location if the user explicitly asks for one.

## Deployment Notes

- `web/Dockerfile` has `runner` and `migrator` stages, consumed by `devops/docker-compose.yml`.
- See `devops/README.md` for the deploy, backup, and restore workflows.

## Code Style and Quality Expectations

- Use function declarations for named React components (matches ESLint rule).
- Keep JSX in `.tsx` files.
- Follow Prettier defaults in `.prettierrc.json` (single quotes, semicolons, trailing commas,
  printWidth 100).
- Respect Tailwind linting via `better-tailwindcss`; keep `app/globals.css` as design token
  source.
- Use `@/*` path alias.
- Avoid adding dependencies unless necessary.

## UI/UX Guardrails

Preserve the "Elevated Harbor" visual language:

- `app/globals.css` is the single source for design tokens. Color scale: `--navy-950/900/800/700`,
  `--gold-300/500/600` (`--gold` aliases `--gold-500`), `--cream`. Semantic tokens: `--surface`,
  `--surface-subtle`, `--border-gold`, `--border-gold-subtle`, `--shadow-card`,
  `--gradient-gold`.
- Use semantic tokens in components; never hard-code hex colors or `color-mix()` recipes inline.
- The page background is a fixed navy gradient set on `body` in `globals.css`; surfaces layer
  translucent glass cards over it.
- Typography: Cinzel (`font-cinzel`) is reserved for the brand wordmark, page titles, and
  card/section headings. Everything else — body text, tables, buttons, nav items, badges, form
  labels — uses Inter (the default sans, loaded as `--font-inter`). Do not put Cinzel on dense
  UI controls.
- Use the shared primitives in `components/ui/` instead of hand-rolling Tailwind class strings:
  - `Button` (variants `primary`/`secondary`/`ghost`/`danger`; `danger` for destructive admin
    actions), or `buttonClasses()` for links/`NewGameButton`-style class props.
  - `Input`/`Select`/`Textarea`/`Label`, or `fieldClasses` on native elements when inline
    handlers would trip `react/jsx-no-bind` (the rule exempts DOM elements but not custom
    components).
  - `Card` for glass surfaces with an optional title/description/badge header, or
    `cardSurfaceClasses` for custom containers; `Badge` for uppercase gold pills.
- Game listings use `components/GameCard.tsx`; it must stay an `<article>` whose text content
  includes player names, scores, and notes (e2e contract).
- New game creation is modal-based via `components/NewGameButton.tsx` (no `/new` route).
- Keep stats section IDs (`#win-rate`, `#podium-rate`, …) stable — e2e tests and the stats
  sidebar anchors depend on them.

## Testing and Verification

Add or update automated tests for any meaningful behavior change; purely cosmetic or copy-only
edits can use lighter judgment. Choose the smallest layer that proves the behavior:

- `tests/unit/**`: pure server/lib/proxy/helper logic (Vitest, node environment)
- `tests/components/**`: interactive UI behavior (Vitest + Testing Library + jsdom)
- `tests/integration/**`: DB-backed domain logic and server-action flows
- `tests/e2e/**`: Playwright coverage for multi-step user journeys, auth, and cross-layer
  regressions

Follow the existing test style: focused `describe`/`it` scenarios; `vi.mock`, `vi.stubEnv`, and
fake timers in unit tests; Testing Library helpers (`render`, `screen`, `waitFor`, `userEvent`)
in component tests; shared DB helpers (`createTestPlayer`, `createTestGame`, the prepared
integration DB flow) instead of bespoke setup. Keep tests grouped under the existing `tests/`
folders.

Test commands — note the scopes:

- `pnpm test` runs **unit + components only** (alias for `pnpm test:fast`).
- `pnpm test:integration` and `pnpm test:e2e` auto-run the test-DB prepare step and need the
  local DB running (`pnpm db:up`).
- `pnpm test:e2e:install` installs Chromium for Playwright (first-time setup).
- `pnpm test:all` runs fast + integration + e2e.

Minimum validation after meaningful changes:

1. `pnpm test`
2. `pnpm lint`
3. `pnpm build`
4. `pnpm test:integration` / `pnpm test:e2e` when the change touches persistence, server
   actions, or multi-step flows
5. Manual smoke check when the change touches the corresponding flows:
   - Create game from home modal
   - Edit/delete game in admin
   - Add/rename/delete player in admin
   - Verify admin login/logout flow
