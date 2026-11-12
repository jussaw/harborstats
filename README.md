# HarborStats

**Live site: [harborstats.jussaw.com](https://harborstats.jussaw.com/)**

HarborStats is a Catan results tracker for a friend group. The tracked repository contains the main web app in `web/`, deployment assets in `devops/`, and CI config in `.github/`.

This root README is the primary entrypoint for the repo. It covers how the project is laid out, how to run it locally, which commands matter day to day, and where deployment guidance lives.

## What the app does today

- Record games with players, scores, winners, notes, and timestamps
- Browse the recent game history from the home page
- Explore stats and activity views
- View multiplayer Elo ratings replayed from recorded game history, with Power Ranking standings, a Rating History chart, and provisional ratings for players with fewer than five rated games
- View player profile pages with player-specific summaries
- Manage data from an admin area protected by a shared password
- Run unit, component, integration, and end-to-end tests

## Repo layout

```text
.
├── .github/     GitHub Actions workflows
├── devops/      Backup/restore scripts and ops docs
├── web/         Next.js app, database schema, scripts, tests, and app-level README
└── README.md    Root project guide
```

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- SQLite (better-sqlite3)
- Drizzle ORM + Drizzle Kit
- Vitest + Testing Library
- Playwright

## Quick start

All app commands run from `web/`.

### Prerequisites

- [Node.js](https://nodejs.org) 22.13 – 26.x (see `web/package.json` `engines.node` for the exact contract)
- [pnpm](https://pnpm.io)

### Local setup

```bash
cd web
cp .env.example .env
pnpm install
pnpm db:migrate   # creates web/data/harborstats.db
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

After the app is running, sign in to `/admin/players` and create your player roster there.
Then go to `/admin/settings` to set the game creation password — you will need it before recording any game.

## Environment variables

Configure local environment variables in `web/.env`.

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_PATH` | `./data/harborstats.db` | Path to the SQLite database file used by the app and scripts (a file path, not a URL) |
| `ADMIN_PASSWORD` | required | Shared password for the `/admin` area |
| `ADMIN_SESSION_SECRET` | required | Secret used to sign admin session cookies |
| `ADMIN_SESSION_VERSION` | `1` | Optional; bumping or changing it invalidates all existing admin sessions without rotating `ADMIN_SESSION_SECRET` |

## Common commands

Run these from `web/`.

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Build the production app |
| `pnpm start` | Start the production server |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format the codebase with Prettier |
| `pnpm format:check` | Check formatting without writing |
| `pnpm test` | Run the fast default test suite |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:components` | Run component tests |
| `pnpm test:integration` | Prepare the test DB and run integration tests |
| `pnpm test:e2e:install` | Install Playwright Chromium |
| `pnpm test:e2e` | Prepare the test DB and run end-to-end tests |
| `pnpm test:all` | Run fast, integration, and e2e suites |
| `pnpm test:ci` | Build the app, then run the full CI-oriented test pipeline |
| `pnpm db:generate` | Generate a new Drizzle migration from `db/schema.ts` changes |
| `pnpm db:migrate` | Apply pending migrations to the SQLite file at `DATABASE_PATH` |
| `pnpm db:studio` | Open Drizzle Studio |

## CI

Pull requests are checked by the PR Smoke pipeline in [.github/workflows/pr-smoke.yml](.github/workflows/pr-smoke.yml). It runs on pull requests that change files under `.github/workflows/**`, `devops/**`, or `web/**`. The pipeline runs these checks in order:

- Lint
- DevOps shell tests
- Build
- Fast tests
- Integration tests
- End-to-end (Playwright) tests

The same checks run again on every push to `main` that changes those paths. When they pass, the pipeline publishes the production image, `ghcr.io/jussaw/harborstats`, tagged `latest` and `sha-<commit>`, for `linux/amd64` and `linux/arm64`.

## Development workflow

### Database and schema changes

When making schema changes:

1. Edit `web/db/schema.ts`
2. Run `pnpm db:generate` from `web/`
3. Review the generated SQL in `web/db/migrations/`
4. Run `pnpm db:migrate`

### Testing

For most day-to-day work, start with:

```bash
cd web
pnpm test
pnpm lint
pnpm build
```

Install Playwright's browser binary once before your first e2e run:

```bash
cd web
pnpm test:e2e:install
```

## Deployment overview

Production runs the published image `ghcr.io/jussaw/harborstats` (the `runner` target of `web/Dockerfile`) as one container, `harborstats-web`, with the SQLite database file mounted at `/data/harborstats.db`.

- The compose stack that runs the container is kept outside this repo; it holds the app's settings (`ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`)
- **Every merge to `main` goes live**: CI publishes a new `latest`, production follows it, and pending migrations run at startup
- In production the app refuses to start on a missing or empty database. A fresh install sets `DATABASE_ALLOW_CREATE=1` for its first start only (see [devops/README.md](devops/README.md))
- `devops/backup-db.sh` and `devops/restore-db.sh` back up and restore the SQLite file in the running container

For the full guide, including what the deploying stack must provide, rollbacks, backups and restores, see [devops/README.md](devops/README.md).

## Additional docs

- [web/README.md](web/README.md): lower-level app README focused on the Next.js app itself
- [devops/README.md](devops/README.md): release, backup, and restore guide
- [CONTEXT.md](CONTEXT.md): the domain glossary and shared vocabulary for HarborStats
- [PLAN.md](PLAN.md): the product roadmap; treat planning material as guidance for direction, not necessarily current behavior
