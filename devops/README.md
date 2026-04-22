# HarborStats DevOps Guide

This directory contains the deployment assets for the HarborStats repo. It is aimed at a single-host Docker Compose deployment where the application image is built from the local `web/` app and the database runs in a named Docker volume.

## Files in this directory

- `docker-compose.yml`: deployment stack definition
- `deploy.sh`: convenience script that pulls the latest code and performs the standard deploy sequence

## Stack overview

`devops/docker-compose.yml` defines these services:

- `db`: PostgreSQL 18 with persistent storage in the `pgdata` named volume
- `web`: the HarborStats app, built from `../web` using the `runner` target in `web/Dockerfile`
- `migrate`: one-off migration runner, built from `../web` using the `migrator` target
- `baseline`: one-off baseline marker for existing databases that already have the initial schema
- `pgadmin`: optional pgAdmin instance for inspecting the database

Published ports from the current compose file:

- `23413`: HarborStats web app
- `5050`: pgAdmin

## Required environment variables

The deploy stack expects these values to be available to Docker Compose when you start it:

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | Yes | `web` | Shared password for the admin UI |
| `ADMIN_SESSION_SECRET` | Yes | `web` | Secret used to sign admin session cookies |

Notes:

- `DATABASE_URL` for the deployed app is set directly in the compose file as `postgres://postgres:postgres@db:5432/harborstats`
- `migrate` and `baseline` also get their `DATABASE_URL` from the compose file
- A practical way to run the deploy is to export the required admin variables in the shell before invoking `./devops/deploy.sh`

Example:

```bash
export ADMIN_PASSWORD='change-me'
export ADMIN_SESSION_SECRET='replace-with-a-long-random-secret'
./devops/deploy.sh
```

## Standard deployment flow

The intended deployment entrypoint is:

```bash
./devops/deploy.sh
```

From the current script, the deploy sequence is:

1. Pull the latest changes into the repo with `git -C "$REPO_DIR" pull`
2. Start the database service
3. Run the `baseline` job
4. Run the `migrate` job
5. Build and start the `web` and `pgadmin` services

The baseline step is designed to be safe to re-run, which lets the deploy script keep a consistent sequence for both new and existing environments.

## Manual Docker Compose commands

If you need to operate the stack manually instead of using the script:

```bash
docker compose -f devops/docker-compose.yml up -d db
docker compose -f devops/docker-compose.yml run --build --rm baseline
docker compose -f devops/docker-compose.yml run --build --rm migrate
docker compose -f devops/docker-compose.yml up --build -d web pgadmin
```

Useful follow-up commands:

```bash
docker compose -f devops/docker-compose.yml ps
docker compose -f devops/docker-compose.yml logs -f web
docker compose -f devops/docker-compose.yml logs -f db
```

## Image build details

The deploy stack depends on `web/Dockerfile`:

- `runner`: production app image used by the `web` service
- `migrator`: lightweight image containing migrations and migration scripts for the `migrate` and `baseline` jobs

Because the compose file builds from `../web`, deploys should be run from a checkout that already contains the desired application code.

## Assumptions and caveats

- This is a single-host Docker Compose deployment, not a full multi-environment platform
- The compose file currently exposes the app directly on port `23413`; any reverse proxy, TLS termination, or domain routing is external to this repo
- `pgadmin` uses default credentials in the compose file (`admin@example.com` / `admin`); keep it on a trusted network or change those values before exposing it more broadly
- Database data persists in the Docker `pgdata` named volume
- Local development uses `web/docker-compose.yml`, not the deployment compose file in this directory
