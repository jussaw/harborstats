#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
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
  COMPOSE_FILE \
  ADMIN_PASSWORD \
  ADMIN_SESSION_SECRET

COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.yml}"
CONFIRMATION_WORD="harborstats"

# Runs as root in a one-off web container with the data volume at /data and the
# backup mounted read-only. The copy is owned by the app user (uid 1001) and
# moved into place in one step; the old -wal/-shm must go, or SQLite would
# replay the previous database's log onto the restored file.
REPLACE_DATABASE_SCRIPT='
cp /restore/harborstats.db /data/.harborstats-restore.db
chown 1001:1001 /data/.harborstats-restore.db
rm -f /data/harborstats.db-wal /data/harborstats.db-shm
mv /data/.harborstats-restore.db /data/harborstats.db
'

log() {
  printf '==> %s\n' "$*"
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

docker_compose() {
  if [[ -f "$ENV_FILE" ]]; then
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
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

  log "Stopping web service"
  docker_compose stop web >/dev/null

  log "Replacing the database file in the data volume"
  docker_compose run --rm -T --no-deps --user root \
    -v "$backup_path:/restore/harborstats.db:ro" \
    web sh -euc "$REPLACE_DATABASE_SCRIPT" >/dev/null

  log "Starting web service"
  docker_compose up -d web >/dev/null

  log "Restore complete"
}

main "$@"
