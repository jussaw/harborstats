# HarborStats DevOps Guide

Production runs one container from the published image `ghcr.io/jussaw/harborstats`, with the SQLite database file in a host directory mounted at `/data`. The compose stack that runs it is kept outside this repo. This directory holds the backup and restore scripts and the operational docs. It no longer contains a compose file or a deploy script.

## Files in this directory

- `README.md`: release, backup, and restore guide
- `.env.example`: example `devops/.env` for the backup and restore scripts
- `backup-db.sh`: production backup script that writes timestamped SQLite backups to the host filesystem
- `restore-db.sh`: production restore script that replaces the deployed database file with a selected backup
- `tests/backup-restore.test.sh`: shell test coverage for the backup and restore scripts and the Dockerfile

## How a change reaches production

1. A pull request passes the PR Smoke checks (see the root `README.md`) and is merged to `main`
2. On the push to `main`, the same workflow runs its checks again. If both jobs pass, it builds the `runner` target of `web/Dockerfile` for `linux/amd64` and `linux/arm64` on native runners and publishes one multi-arch manifest tagged `latest` and `sha-<full commit sha>`
3. Production follows `latest`: the new digest is pulled and `harborstats-web` is recreated with the same settings
4. On start the app applies pending migrations before it serves requests (`web/instrumentation.ts` → `web/lib/startup.ts`). A failed migration stops the container

There is no manual deploy step: **every merge to `main` that touches `web/`, `devops/` or `.github/workflows/` goes live**, including its migrations. Before merging a risky schema change, take a backup on the production host (`./devops/backup-db.sh`). To roll out a published image right away, redeploy the stack that runs it with a fresh pull.

### Rolling back an image

Pin the service to an earlier build in the deploying compose file, for example `image: ghcr.io/jussaw/harborstats:sha-<commit>`, and redeploy it. An updater that follows tags only re-pulls the tag a container already uses, so a pinned `sha-` tag stays put. Migrations only move forward: if the newer image already migrated the database, an older image may not understand the new schema. In that case, also restore the backup taken before the merge.

## What the deploying stack provides

The image sets `NODE_ENV=production`, `PORT=3000` and `DATABASE_PATH=/data/harborstats.db`, and runs as the `nextjs` user (uid `1001`). The compose service that runs it provides:

| Setting | Required | Notes |
| --- | --- | --- |
| `container_name: harborstats-web` | Yes, for the scripts | `backup-db.sh` and `restore-db.sh` find the app by this name (override with `CONTAINER_NAME`) |
| A mount at `/data` | Yes | Holds `harborstats.db` and, while the app runs, its `-wal` and `-shm` files. The directory must be writable by uid `1001` |
| Port `3000` | Yes | The app listens here inside the container |
| `ADMIN_PASSWORD` | Yes | Shared password for the admin UI |
| `ADMIN_SESSION_SECRET` | Yes | Signs the admin session and game-unlock cookies. Changing it signs everyone out |
| `ADMIN_SESSION_VERSION` | No (default `1`) | Bump it and recreate the container to invalidate all admin sessions without rotating `ADMIN_SESSION_SECRET`. Write it as `${…:-1}` so an empty value reaches the app as `1`, not as an empty string |
| `DATABASE_ALLOW_CREATE` | No | **Fresh installs only**, see below. Never set it on a deployment that has data |
| `TZ` | No | Only affects server-rendered defaults such as the new-game form's time; timestamps are stored in UTC |

### Empty-database guard

In production the app refuses to start if the database file is missing or contains no tables. The container exits with code 1 and logs:

```text
Error: Refusing to start: database at /data/harborstats.db is missing or empty. Set DATABASE_ALLOW_CREATE=1 for a fresh install.
```

This stops a wrong mount or path from quietly serving an empty site. With a restart policy the container keeps retrying and logging the same line until the mount is fixed. On a normal start the log shows `[startup] Opened the existing database at /data/harborstats.db`; on a first start with `DATABASE_ALLOW_CREATE=1` it shows `[startup] Created a new database at /data/harborstats.db`.

### Fresh install

1. Create the data directory on the host and give it to uid `1001` (`sudo install -d -o 1001 -g 1001 <dir>`). Docker would otherwise create a missing bind-mount source owned by root, and SQLite could not create its files there
2. Deploy the service once with `DATABASE_ALLOW_CREATE=1` and check the log for `Created a new database`
3. Remove `DATABASE_ALLOW_CREATE` and redeploy

### Moving an existing database onto a host

To start a new deployment from an existing `.db` file, for example a backup from another host:

1. Deploy the service with an empty data directory owned by uid `1001`. The empty-database guard keeps the container restarting, which is expected
2. Run `./devops/restore-db.sh /path/to/harborstats.db`. It stops the container, copies the file into its `/data` and starts it again (see below)

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

## Script settings

The scripts run from a checkout of this repo on the production host and read `devops/.env` by default:

```bash
cp devops/.env.example devops/.env
```

Explicit shell environment variables override values from that file. To read a different file, set `ENV_FILE=/path/to/file.env`.

| Variable | Default | Used by | Notes |
| --- | --- | --- | --- |
| `BACKUP_DIR` | `/var/backups/harborstats` | `backup-db.sh` | Host directory where backups and checksum files are written |
| `RETENTION_DAYS` | `30` | `backup-db.sh` | Number of days to keep old `harborstats-*.db` and `.db.sha256` files |
| `CONTAINER_NAME` | `harborstats-web` | both | The app container |
| `STARTUP_TIMEOUT_SECONDS` | `120` | `restore-db.sh` | How long to wait for the app's startup line after restarting the container before failing |

The scripts need only `docker` and `sha256sum` (or `shasum`). They never read the app's settings and do not depend on which compose project created the container.

## Database backups

Local development uses a SQLite file under `web/data/` and has no backup script.

### Backup behavior

- Backups are full copies of the SQLite database taken with `VACUUM INTO` inside the running container. It reads a consistent snapshot in one transaction while the app keeps writing; a plain file copy of a live WAL database could be torn
- Each backup is checked with `PRAGMA integrity_check` before it leaves the container, and the copy on the host must have the same sha256 as the checked file; otherwise the script fails and leaves no `.db` behind
- Backups are written on the Docker host as `harborstats-<UTC timestamp>.db`, each with a sibling `.db.sha256`
- Default retention: `30` days. Only `harborstats-*.db` and `harborstats-*.db.sha256` files older than `RETENTION_DAYS` are pruned. Older Postgres dumps (`*.dump`, `*.dump.sha256`) in the same folder are never pruned; remove them by hand when they are no longer needed
- The container must be running; the script fails if it is not

Because backups stay on the same host, this protects against accidental data loss but does **not** protect against total host loss or disk failure.

### Run a one-off backup

From the repo checkout on the production host:

```bash
./devops/backup-db.sh
```

Override the directory or retention per command if needed:

```bash
BACKUP_DIR=/srv/harborstats/backups RETENTION_DAYS=14 ./devops/backup-db.sh
```

The script will:

1. Check that the container is running
2. Write a snapshot with `VACUUM INTO` to a temporary file in `/data` inside the container
3. Run `PRAGMA integrity_check` on it and stop unless the result is `ok`
4. Copy it to the host as, for example, `/var/backups/harborstats/harborstats-20260422T040000Z.db`, and check its sha256 against the container copy
5. Write the `.db.sha256` file beside it
6. Remove the temporary file from the container and delete SQLite backups older than the retention window

### Schedule the nightly backup

The scheduler is host-managed cron, not a Docker service. Example entry for daily backups at midnight Eastern Time:

```cron
CRON_TZ=America/New_York
0 0 * * * cd /path/to/harborstats && ./devops/backup-db.sh >> /var/log/harborstats-db-backup.log 2>&1
```

Install it with `crontab -e` on the production host, replacing `/path/to/harborstats` with the checkout path. The checkout only supplies the scripts: pull it to update them; the app itself comes from the image.

### Restore from a backup

Restores are in-place production recovery operations. Expect downtime while the restore runs.

Before you restore:

1. Make sure you have picked the correct `harborstats-*.db` file from the backup directory
2. Take a fresh backup first if you might need to roll back the restore attempt itself

To restore:

```bash
./devops/restore-db.sh /var/backups/harborstats/harborstats-20260422T040000Z.db
```

The restore script will:

1. Refuse a file that is not a SQLite database (for example an old `.dump`)
2. Verify the file against its sibling `.sha256`, when one exists, and stop on a mismatch
3. Ask for confirmation by requiring you to type `harborstats`
4. Find the container and the image it runs, and stop before changing anything if there is no container
5. Stop the container so the app cannot write during recovery
6. In a one-off root container from the same image, with the app container's mounts (`--volumes-from`) and no network: copy the backup into `/data`, check that the copy's sha256 equals the backup's, make `/data` and the file owned by uid `1001`, delete the old `harborstats.db-wal` and `harborstats.db-shm`, and move the copy to `/data/harborstats.db`. The script prints the sha256 of the file in `/data`
7. Start the container again and wait for its startup line. If the container exits or restarts instead, or the line does not appear within `STARTUP_TIMEOUT_SECONDS`, it prints the last log lines and exits non-zero. Pending migrations, if any, run at startup

The restore never sets `DATABASE_ALLOW_CREATE`. The printed sha256 is the file as restored; once the app opens it, SQLite switches it to WAL mode, which changes the file's header and so its checksum.

Because the container keeps its settings, a restore needs nothing from the deploying stack. A redeploy of that stack later leaves the restored file in place, since it lives in the mounted directory, not in the container.

## Image build details

`web/Dockerfile`'s `runner` target is the published image. It:

- contains the Next.js standalone server and the native `better-sqlite3` binding (a prebuilt `linuxmusl` binary, so no build tools are needed)
- contains `db/migrations`, applied at startup
- creates `/data` owned by the app user (uid `1001`)
- sets `DATABASE_PATH=/data/harborstats.db`
- includes the `sqlite3` CLI, used by the scripts and for inspection

To build it locally, for example to try a Dockerfile change:

```bash
docker build --target runner -t harborstats:local web
```

## Assumptions and caveats

- This is a single-host deployment, not a multi-environment platform
- The app is published directly on a host port; TLS and domain routing are handled outside this repo

### Restrict origin access to the CDN/proxy (security)

The app derives the client IP from request headers (`cf-connecting-ip`, then
`x-forwarded-for` / `x-real-ip`; see `web/lib/request-ip.ts`) and uses it for
the admin-login / game-unlock **rate limiter** and for the **audit log** actor
IP. Those headers are only trustworthy when they are set by the fronting
CDN/proxy (Cloudflare).

Because the app is published directly on a host port, any client that can
reach the origin **without going through Cloudflare** can spoof
`cf-connecting-ip` to a rotating value and thereby bypass the per-IP rate limit
(enabling password brute force) and poison audit-log IPs. Mitigate by ensuring
the origin is only reachable via the CDN, for example:

- Firewall the published port so only Cloudflare IP ranges can connect
  (<https://www.cloudflare.com/ips/>), or bind it to localhost
  (`127.0.0.1:<port>:3000`) and front it with a local reverse proxy, and
- Consider Cloudflare Tunnel / Authenticated Origin Pulls so the origin never
  accepts direct public traffic.
