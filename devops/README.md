# HarborStats DevOps Guide

This directory contains the deployment assets for the HarborStats repo. It is aimed at a single-host Docker Compose deployment where the application image is built from the local `web/` app and the database runs in a named Docker volume.

## Files in this directory

- `README.md`: deployment, backup, and restore guide for the tracked `devops/` assets
- `docker-compose.yml`: deployment stack definition
- `deploy.sh`: convenience script that pulls the latest code and performs the standard deploy sequence
- `.env.example`: example production environment file for Docker Compose and the backup/restore scripts
- `backup-db.sh`: production backup script that writes timestamped Postgres dumps to the host filesystem
- `restore-db.sh`: production restore script that replaces the deployed database from a selected dump
- `tests/backup-restore.test.sh`: shell test coverage for the backup and restore scripts

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

The deploy stack expects these values to be available to Docker Compose when you start it. The simplest production setup is to copy `.env.example` to `devops/.env` and edit it there.

```bash
cp devops/.env.example devops/.env
```

Both `backup-db.sh` and `restore-db.sh` automatically load `devops/.env` by default. Explicit shell environment variables still override values from that file.

Required values:

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | Yes | `web` | Shared password for the admin UI |
| `ADMIN_SESSION_SECRET` | Yes | `web` | Secret used to sign admin session cookies |

Optional backup and restore script values:

| Variable | Default | Used by | Notes |
| --- | --- | --- | --- |
| `BACKUP_DIR` | `/var/backups/harborstats` | `backup-db.sh` | Host directory where dumps and checksum files are written |
| `RETENTION_DAYS` | `30` | `backup-db.sh` | Number of days to keep old `.dump` and `.sha256` files |
| `DATABASE_NAME` | `harborstats` | `backup-db.sh`, `restore-db.sh` | Database name used for `pg_dump`, `dropdb`, `createdb`, and `pg_restore` |
| `POSTGRES_USER` | `postgres` | `backup-db.sh`, `restore-db.sh` | Database user passed to Postgres CLI tools inside the container |

Notes:

- `DATABASE_URL` for the deployed app is set directly in the compose file as `postgres://postgres:postgres@db:5432/harborstats`
- `migrate` and `baseline` also get their `DATABASE_URL` from the compose file
- `restore-db.sh` restarts `web`, so `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` need to be present in `devops/.env` or exported in the shell before you restore
- If you want the scripts to read a different env file, set `ENV_FILE=/path/to/file.env`

Example:

```bash
cp devops/.env.example devops/.env
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

## Database backups

This backup flow is for the production deployment described in this directory. It is not part of the local development setup in `web/docker-compose.yml`.

### Backup behavior

- Backups are logical PostgreSQL dumps created with `pg_dump --format=custom`
- Dumps are written on the Docker host, not inside the container
- Default backup directory: `/var/backups/harborstats`
- Default retention: `30` days
- The backup script also writes a sibling `.sha256` file when a checksum utility is available on the host
- Old `.dump` and `.dump.sha256` files older than `RETENTION_DAYS` are pruned automatically

Because backups stay on the same host, this protects against accidental data loss inside the running stack but does **not** protect against total host loss or disk failure.

### Run a one-off backup

Run this from the repo checkout on the production host:

```bash
./devops/backup-db.sh
```

Optional overrides:

- set `BACKUP_DIR` or `RETENTION_DAYS` in `devops/.env`
- or override them per command, for example:

```bash
BACKUP_DIR=/srv/harborstats/backups RETENTION_DAYS=14 ./devops/backup-db.sh
```

The script will:

1. Start `db` if needed
2. Wait for the database to become healthy
3. Write a timestamped dump such as `/var/backups/harborstats/harborstats-20260422T040000Z.dump`
4. Write a checksum file beside it when available
5. Delete expired backup files older than the retention window

To see the backups currently on disk:

```bash
ls -lh /var/backups/harborstats
```

### Schedule the nightly backup

The intended scheduler is host-managed cron, not an extra Docker service.

Example crontab entry for daily backups at midnight Eastern Time:

```cron
CRON_TZ=America/New_York
0 0 * * * cd /path/to/harborstats && ./devops/backup-db.sh >> /var/log/harborstats-db-backup.log 2>&1
```

Install it with `crontab -e` on the production host, replacing `/path/to/harborstats` with the real checkout path.

### Restore from a backup

Restores are in-place production recovery operations. Expect application downtime while the restore is running.

Before you restore:

1. Make sure you have picked the correct `.dump` file from the host backup directory
2. Confirm the repo checkout contains the app version you want to run after recovery
3. Consider taking a fresh backup first if you might need to roll back the restore attempt itself

To restore:

```bash
./devops/restore-db.sh /var/backups/harborstats/harborstats-20260422T040000Z.dump
```

The restore script will:

1. Ask for confirmation by requiring you to type `harborstats`
2. Stop the `web` service so the app cannot write during recovery
3. Start `db` and wait for it to become healthy
4. Terminate active connections to the `harborstats` database
5. Drop and recreate the `harborstats` database
6. Restore the selected dump with `pg_restore`
7. Run the existing `migrate` job so the restored schema matches the deployed app code
8. Start `web` again

If you want to inspect the available backups before restoring:

```bash
ls -lh /var/backups/harborstats/*.dump
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
