#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-$SCRIPT_DIR/.env}"

load_env_defaults() {
  local env_file="$1"
  shift

  [[ -f "$env_file" ]] || return 0

  local key=""
  local raw_value=""

  for key in "$@"; do
    if [[ -n "${!key+x}" ]]; then
      continue
    fi

    raw_value="$(
      sed -n -E "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*(.*)[[:space:]]*$/\\1/p" "$env_file" | tail -n 1
    )"

    if [[ -z "$raw_value" ]]; then
      continue
    fi

    if [[ "$raw_value" =~ ^\"(.*)\"$ ]]; then
      raw_value="${BASH_REMATCH[1]}"
    elif [[ "$raw_value" =~ ^\'(.*)\'$ ]]; then
      raw_value="${BASH_REMATCH[1]}"
    fi

    export "$key=$raw_value"
  done
}

load_env_defaults "$ENV_FILE" \
  CONTAINER_NAME

# The deployed app container, whichever compose project created it. The restore
# works on its own mounts and image, so it never needs that project's compose
# file or env.
CONTAINER_NAME="${CONTAINER_NAME:-harborstats-web}"
CONFIRMATION_WORD="harborstats"
STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-120}"

# Runs as root in a one-off container from the app's own image, with the app
# container's mounts (--volumes-from, so /data is its bind mount or volume) and
# the backup mounted read-only. The copy must match the backup byte for byte, and
# it and /data are owned by the app user (uid 1001): a bind-mount directory or a
# volume created outside the image can have a root-owned /data, where SQLite
# cannot create its -wal/-shm files. The file moves into place in one step; the old -wal/-shm must
# go, or SQLite would replay the previous database's log onto the restored file.
REPLACE_DATABASE_SCRIPT='
backup_sum="$(sha256sum /restore/harborstats.db | cut -d " " -f 1)"
cp /restore/harborstats.db /data/.harborstats-restore.db
copy_sum="$(sha256sum /data/.harborstats-restore.db | cut -d " " -f 1)"
if [ "$copy_sum" != "$backup_sum" ]; then
  rm -f /data/.harborstats-restore.db
  echo "The copy in the volume does not match the backup" >&2
  exit 1
fi
chown 1001:1001 /data
chown 1001:1001 /data/.harborstats-restore.db
rm -f /data/harborstats.db-wal /data/harborstats.db-shm
mv /data/.harborstats-restore.db /data/harborstats.db
echo "sha256=$copy_sum"
'

log() {
  printf '==> %s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{ print $1 }'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{ print $1 }'
  else
    die "Required command not found: sha256sum or shasum"
  fi
}

verify_sqlite_file() {
  local backup_path="$1"
  local header=""
  header="$(head -c 15 "$backup_path")"
  [[ "$header" == "SQLite format 3" ]] || die "$backup_path is not a SQLite database file; aborting restore"
}

verify_checksum() {
  local backup_path="$1"
  local checksum_path="${backup_path}.sha256"

  if [[ ! -f "$checksum_path" ]]; then
    log "No $(basename "$checksum_path") next to the backup; skipping checksum verification"
    return 0
  fi

  local expected=""
  local actual=""
  expected="$(awk 'NR == 1 { print $1 }' "$checksum_path")"
  actual="$(sha256_of "$backup_path")"
  if [[ -z "$expected" || "$expected" != "$actual" ]]; then
    die "Checksum mismatch for $backup_path (expected ${expected:-none}, got $actual); aborting restore"
  fi
  log "Checksum verified"
}

# Migrations run inside the container after `docker start` has returned, so a
# failed migration or a refused database shows only in the container: wait for
# the app's startup line instead of trusting `start`.
wait_for_web_startup() {
  local since="$1"
  local deadline=$((SECONDS + STARTUP_TIMEOUT_SECONDS))
  local state=""
  local logs=""

  while :; do
    state="$(docker inspect --format '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || true)"

    logs="$(docker logs --since "$since" "$CONTAINER_NAME" 2>&1 || true)"
    if [[ "$logs" == *"[startup] Opened the existing database"* || "$logs" == *"[startup] Created a new database"* ]]; then
      log "web started: $(printf '%s\n' "$logs" | grep -F '[startup]' | tail -n 1)"
      return 0
    fi

    if [[ "$state" == "exited" || "$state" == "restarting" || "$state" == "dead" ]] || ((SECONDS >= deadline)); then
      printf '%s\n' "$logs" | tail -n 20 >&2
      die "web did not start (state: ${state:-missing}); see the log lines above"
    fi

    sleep 2
  done
}

confirm_restore() {
  local backup_path="$1"
  printf "About to restore '%s' as the HarborStats database.\n" "$backup_path"
  printf "This will stop the app and replace current production data.\n"
  printf "Type '%s' to continue: " "$CONFIRMATION_WORD"

  local confirmation=""
  read -r confirmation

  if [[ "$confirmation" != "$CONFIRMATION_WORD" ]]; then
    die "Confirmation did not match '$CONFIRMATION_WORD'; aborting restore"
  fi
}

main() {
  ensure_command docker

  [[ $# -eq 1 ]] || die "Usage: ./devops/restore-db.sh /path/to/harborstats-<timestamp>.db"

  local backup_path="$1"
  [[ -f "$backup_path" ]] || die "Backup file does not exist: $backup_path"
  # Bind mounts need an absolute path.
  backup_path="$(cd "$(dirname "$backup_path")" && pwd -P)/$(basename "$backup_path")"

  verify_sqlite_file "$backup_path"
  verify_checksum "$backup_path"
  confirm_restore "$backup_path"

  # The exact image the container runs, so the one-off container has the same
  # user ids and paths. Failing here stops the restore before anything changes.
  local image=""
  image="$(docker inspect --format '{{.Image}}' "$CONTAINER_NAME" 2>/dev/null)" ||
    die "No $CONTAINER_NAME container; deploy the app first, then restore (see devops/README.md)"

  log "Stopping $CONTAINER_NAME"
  docker stop "$CONTAINER_NAME" >/dev/null

  log "Replacing the database file in $CONTAINER_NAME's /data"
  local replace_output=""
  if ! replace_output="$(
    docker run --rm --network none --user root \
      --volumes-from "$CONTAINER_NAME" \
      -v "$backup_path:/restore/harborstats.db:ro" \
      "$image" sh -euc "$REPLACE_DATABASE_SCRIPT" 2>&1
  )"; then
    printf '%s\n' "$replace_output" >&2
    die "Replacing the database file failed; $CONTAINER_NAME is stopped (start it with: docker start $CONTAINER_NAME)"
  fi
  log "Database file in /data: $(printf '%s\n' "$replace_output" | grep '^sha256=' | tail -n 1)"

  log "Starting $CONTAINER_NAME"
  local since=""
  since="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
  docker start "$CONTAINER_NAME" >/dev/null

  log "Waiting for web to start"
  wait_for_web_startup "$since"

  log "Restore complete"
}

main "$@"
