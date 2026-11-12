# HarborStats DevOps Guide

This directory contains the deployment assets for the HarborStats repo. It is aimed at a single-host Docker Compose deployment: one container, built from the local `web/` app, with the SQLite database file in a named Docker volume.

## Files in this directory

- `README.md`: deployment, backup, and restore guide for the tracked `devops/` assets
- `docker-compose.yml`: deployment stack definition
- `deploy.sh`: convenience script that pulls the latest code and rebuilds and restarts the app
- `.env.example`: example production environment file for Docker Compose and the backup/restore scripts
- `backup-db.sh`: production backup script that writes timestamped SQLite backups to the host filesystem
- `restore-db.sh`: production restore script that replaces the deployed database file with a selected backup
- `tests/backup-restore.test.sh`: shell test coverage for the deploy, backup, and restore scripts and the compose file

## Stack overview

`devops/docker-compose.yml` defines one service:

- `web` (container `harborstats-web`): the HarborStats app, built from `../web` using the `runner` target in `web/Dockerfile`. The database is the SQLite file `/data/harborstats.db` inside the container.

and one named volume:

- `harborstats_data`, mounted at `/data`. The volume name is fixed (it does not depend on the compose project name). It holds `harborstats.db` and, while the app runs, its `-wal` and `-shm` files.

Migrations run inside the `web` container at startup, before the server takes requests (`web/instrumentation.ts` → `web/lib/startup.ts`). A failed migration stops the container. There is no separate migration job.

Published ports from the current compose file:

- `23413`: HarborStats web app

## Required environment variables

The deploy stack expects these values to be available to Docker Compose when you start it. The simplest production setup is to copy `.env.example` to `devops/.env` and edit it there.

```bash
cp devops/.env.example devops/.env
```

`deploy.sh`, `backup-db.sh`, and `restore-db.sh` automatically load `devops/.env` by default. Explicit shell environment variables still override values from that file.

Required values:

| Variable | Required | Used by | Notes |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | Yes | `web` | Shared password for the admin UI |
| `ADMIN_SESSION_SECRET` | Yes | `web` | Secret used to sign admin session cookies |

Optional app values:

| Variable | Default | Used by | Notes |
| --- | --- | --- | --- |
| `ADMIN_SESSION_VERSION` | `1` | `web` | Bump it and redeploy `web` to invalidate all existing admin sessions without rotating `ADMIN_SESSION_SECRET`. Unset or empty renders as `1` |
| `DATABASE_ALLOW_CREATE` | unset | `web` | **Fresh installs only.** Set to `1` for the very first start so the app may create an empty database. Without it the app refuses to start when `/data/harborstats.db` is missing or has no tables (see below). Remove it again after the first start |

Optional backup and restore script values:

| Variable | Default | Used by | Notes |
| --- | --- | --- | --- |
| `BACKUP_DIR` | `/var/backups/harborstats` | `backup-db.sh` | Host directory where backups and checksum files are written |
| `RETENTION_DAYS` | `30` | `backup-db.sh` | Number of days to keep old `harborstats-*.db` and `.db.sha256` files |

Notes:

- `DATABASE_PATH=/data/harborstats.db` is set in both the image and the compose file; there is nothing to configure
- `restore-db.sh` restarts `web`, so `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` need to be present in `devops/.env` or exported in the shell before you restore
- Keep a bumped `ADMIN_SESSION_VERSION` in `devops/.env` rather than only in your shell, otherwise the next deploy or restore restarts `web` with the default `1` and re-validates the sessions you meant to invalidate
- If you want the scripts to read a different env file, set `ENV_FILE=/path/to/file.env`

### Empty-database guard

In production the app refuses to start if the database file is missing or contains no tables, and the container exits with code 1 and logs:

```text
Error: Refusing to start: database at /data/harborstats.db is missing or empty. Set DATABASE_ALLOW_CREATE=1 for a fresh install.
```

This stops a wrong volume or path from quietly serving an empty site. With `restart: always` the container keeps retrying and logging the same line until the volume is fixed. On a normal start the log shows `[startup] Opened the existing database at /data/harborstats.db`; on a first start with `DATABASE_ALLOW_CREATE=1` it shows `[startup] Created a new database at /data/harborstats.db`.

### Fresh install

```bash
cp devops/.env.example devops/.env    # then edit it
DATABASE_ALLOW_CREATE=1 docker compose --env-file devops/.env -f devops/docker-compose.yml up --build -d web
docker compose --env-file devops/.env -f devops/docker-compose.yml logs web | grep startup   # "Created a new database"
docker compose --env-file devops/.env -f devops/docker-compose.yml up -d web   # recreate without the flag
```

Never set `DATABASE_ALLOW_CREATE` in `devops/.env` on a deployment that already has data, and never set it when restoring or moving data.

## Standard Deployment Flow

The intended deployment entrypoint is:

```bash
./devops/deploy.sh
```

The deploy sequence is:

1. Pull the latest changes into the repo with `git -C "$REPO_DIR" pull`
2. Build and start the `web` service (`docker compose up --build -d web`); pending migrations run when the container starts

`deploy.sh` does not pass `--remove-orphans`, so containers from an older version of the stack are never removed by a deploy.

## Manual Docker Compose commands

If you need to operate the stack manually instead of using the script:

```bash
docker compose --env-file devops/.env -f devops/docker-compose.yml up --build -d web
```

Useful follow-up commands:

```bash
docker compose -f devops/docker-compose.yml ps
docker compose -f devops/docker-compose.yml logs -f web
```

## Inspecting the database

There is no database admin UI. To look at the data, inspect a **backup copy** with the `sqlite3` CLI rather than the live file:

```bash
./devops/backup-db.sh
sqlite3 -readonly /var/backups/harborstats/harborstats-20260422T040000Z.db
```

The `sqlite3` CLI is also in the app image for quick read-only checks, for example row counts:

```bash
docker exec harborstats-web sqlite3 -readonly /data/harborstats.db "select count(*) from games;"
```

`sqlite3` connections run with foreign keys off. If you ever must write by hand, run `PRAGMA foreign_keys = ON;` first, and take a backup before you do.

## Database backups

This backup flow is for the production deployment described in this directory. Local development uses a SQLite file under `web/data/` and has no backup script.

### Backup behavior

- Backups are full copies of the SQLite database taken with `VACUUM INTO` inside the running `web` container. It reads a consistent snapshot in one transaction while the app keeps writing; a plain file copy of a live WAL database could be torn
- Each backup is checked with `PRAGMA integrity_check` before it leaves the container, and the copy on the host must have the same sha256 as the checked file; otherwise the script fails and leaves no `.db` behind
- Backups are written on the Docker host as `harborstats-<UTC timestamp>.db`, each with a sibling `.db.sha256`
- Default backup directory: `/var/backups/harborstats`
- Default retention: `30` days. Only `harborstats-*.db` and `harborstats-*.db.sha256` files older than `RETENTION_DAYS` are pruned. Older Postgres dumps (`*.dump`, `*.dump.sha256`) in the same folder are never pruned; remove them by hand when they are no longer needed
- The `web` service must be running; the script fails if it is not

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

1. Check that `web` is running
2. Write a snapshot with `VACUUM INTO` to a temporary file in `/data` inside the container
3. Run `PRAGMA integrity_check` on it and stop unless the result is `ok`
4. Copy it to the host as, for example, `/var/backups/harborstats/harborstats-20260422T040000Z.db`, and check its sha256 against the container copy
5. Write the `.db.sha256` file beside it
6. Remove the temporary file from the container and delete SQLite backups older than the retention window

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

1. Make sure you have picked the correct `harborstats-*.db` file from the host backup directory
2. Confirm the repo checkout contains the app version you want to run after recovery
3. Take a fresh backup first if you might need to roll back the restore attempt itself

To restore:

```bash
./devops/restore-db.sh /var/backups/harborstats/harborstats-20260422T040000Z.db
```

The restore script will:

1. Refuse a file that is not a SQLite database (for example an old `.dump`)
2. Verify the file against its sibling `.sha256`, when one exists, and stop on a mismatch
3. Ask for confirmation by requiring you to type `harborstats`
4. Stop the `web` service so the app cannot write during recovery
5. In a one-off root container on the same volume, copy the backup to `/data/harborstats.db` owned by uid `1001` (the app user), and delete the old `harborstats.db-wal` and `harborstats.db-shm`
6. Start `web` again; pending migrations, if any, run at startup

The restore never sets `DATABASE_ALLOW_CREATE`.

If you want to inspect the available backups before restoring:

```bash
ls -lh /var/backups/harborstats/*.db
```

## Image build details

The deploy stack depends on the `runner` target of `web/Dockerfile`. The image:

- contains the Next.js standalone server and the native `better-sqlite3` binding (a prebuilt `linuxmusl` binary, so no build tools are needed)
- contains `db/migrations`, applied at startup
- creates `/data` owned by the app user (uid `1001`), so a new named volume starts out writable
- sets `DATABASE_PATH=/data/harborstats.db`
- includes the `sqlite3` CLI, used by `backup-db.sh` and for inspection

Because the compose file builds from `../web`, deploys should be run from a checkout that already contains the desired application code.

## Assumptions and caveats

- This is a single-host Docker Compose deployment, not a full multi-environment platform
- The compose file currently exposes the app directly on port `23413`; any reverse proxy, TLS termination, or domain routing is external to this repo
- Database data persists in the `harborstats_data` named volume. The compose file does not declare or touch the old `pgdata` volume from the Postgres-based stack

### Restrict origin access to the CDN/proxy (security)

The app derives the client IP from request headers (`cf-connecting-ip`, then
`x-forwarded-for` / `x-real-ip`; see `web/lib/request-ip.ts`) and uses it for
the admin-login / game-unlock **rate limiter** and for the **audit log** actor
IP. Those headers are only trustworthy when they are set by the fronting
CDN/proxy (Cloudflare).

Because the compose stack publishes the app directly on host port `23413`, any
client that can reach the origin **without going through Cloudflare** can spoof
`cf-connecting-ip` to a rotating value and thereby bypass the per-IP rate limit
(enabling password brute force) and poison audit-log IPs. Mitigate by ensuring
the origin is only reachable via the CDN, for example:

- Firewall port `23413` so only Cloudflare IP ranges can connect
  (<https://www.cloudflare.com/ips/>), or bind it to localhost
  (`127.0.0.1:23413:3000`) and front it with a local reverse proxy, and
- Consider Cloudflare Tunnel / Authenticated Origin Pulls so the origin never
  accepts direct public traffic.
