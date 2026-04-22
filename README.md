# HarborStats

HarborStats is a Catan results tracker for a friend group. The tracked repository contains the main web app in `web/`, deployment assets in `devops/`, CI config in `.github/`, and a running feature/idea inventory in `PLAN.md`.

This root README is the primary entrypoint for the repo. It covers how the project is laid out, how to run it locally, which commands matter day to day, and where deployment guidance lives.

## What the app does today

- Record games with players, scores, winners, notes, and timestamps
- Browse the recent game history from the home page
- Explore stats and activity views
- View player profile pages with player-specific summaries
- Manage data from an admin area protected by a shared password
- Run unit, component, integration, and end-to-end tests

## Repo layout

```text
.
├── .github/     GitHub Actions workflows
├── devops/      Docker Compose deployment stack, backup/restore scripts, and ops docs
├── web/         Next.js app, database schema, scripts, tests, and app-level README
├── PLAN.md      Feature ideas and implementation status tracker
└── README.md    Root project guide
```

## Tech stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- PostgreSQL 18
- Drizzle ORM + Drizzle Kit
- Vitest + Testing Library
- Playwright

## Quick start

All app commands run from `web/`.

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io)
- [Docker](https://www.docker.com) for the local Postgres database

### Local setup

```bash
cd web
cp .env.example .env
pnpm install
pnpm db:up
pnpm db:migrate
pnpm dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

After the app is running, sign in to `/admin/players` and create your player roster there.

## Environment variables

Configure local environment variables in `web/.env`.

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/harborstats` | Postgres connection string used by the app and scripts |
| `ADMIN_PASSWORD` | required | Shared password for the `/admin` area |
| `ADMIN_SESSION_SECRET` | required | Secret used to sign admin session cookies |

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
| `pnpm db:up` | Start the local Postgres container from `web/docker-compose.yml` |
| `pnpm db:generate` | Generate a new Drizzle migration from `db/schema.ts` changes |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:baseline` | Mark the initial migration as already applied for an existing database |
| `pnpm db:studio` | Open Drizzle Studio |

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

Production-style deployment assets live in `devops/`.

- `devops/docker-compose.yml` defines the deploy stack
- `devops/deploy.sh` pulls the latest code, starts the database, runs baseline and migrations, then brings up the app
- `web/Dockerfile` provides the `runner` and `migrator` image targets used by the deploy stack

For the full deployment guide, including service roles, environment assumptions, and manual compose commands, see [devops/README.md](devops/README.md).

## Additional docs

- [web/README.md](web/README.md): lower-level app README focused on the Next.js app itself
- [devops/README.md](devops/README.md): deployment, backup, and restore guide
- [PLAN.md](PLAN.md): implemented and planned feature ideas; treat unchecked items as roadmap, not current behavior
