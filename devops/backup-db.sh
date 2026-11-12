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
  BACKUP_DIR \
  RETENTION_DAYS \
  ADMIN_PASSWORD \
  ADMIN_SESSION_SECRET

COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/harborstats}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# Inside the web container (see web/Dockerfile and devops/docker-compose.yml).
CONTAINER_DATABASE_PATH="/data/harborstats.db"

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

CONTAINER_TEMP_PATH=""
LOCAL_TEMP_PATH=""

cleanup_temp_files() {
  if [[ -n "$LOCAL_TEMP_PATH" && -f "$LOCAL_TEMP_PATH" ]]; then
    rm -f "$LOCAL_TEMP_PATH"
  fi
  if [[ -n "$CONTAINER_TEMP_PATH" ]]; then
    docker_compose exec -T web rm -f "$CONTAINER_TEMP_PATH" "$CONTAINER_TEMP_PATH-wal" "$CONTAINER_TEMP_PATH-shm" \
      >/dev/null 2>&1 || true
  fi
}

trap cleanup_temp_files EXIT

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

checksum_command() {
  if command -v sha256sum >/dev/null 2>&1; then
    echo "sha256sum"
  elif command -v shasum >/dev/null 2>&1; then
    echo "shasum -a 256"
  else
    die "Required command not found: sha256sum or shasum"
  fi
}

sha256_of() {
  # shellcheck disable=SC2046 # the command is one or two words by design
  $(checksum_command) "$1" | awk '{ print $1 }'
}

write_checksum() {
  local backup_path="$1"
  local checksum_path="$2"
  local temp_checksum_path="${checksum_path}.tmp"

  # shellcheck disable=SC2046
  $(checksum_command) "$backup_path" >"$temp_checksum_path"
  mv "$temp_checksum_path" "$checksum_path"
}

prune_old_backups() {
  # Only SQLite backups. Pre-SQLite Postgres dumps (*.dump) are kept until
  # someone removes them by hand.
  find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name "harborstats-*.db" -o -name "harborstats-*.db.sha256" \) \
    -mtime "+$RETENTION_DAYS" -delete
}

main() {
  ensure_command docker
  checksum_command >/dev/null
  mkdir -p "$BACKUP_DIR"

  local timestamp
  timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"

  local final_backup_path="$BACKUP_DIR/harborstats-${timestamp}.db"
  local checksum_path="${final_backup_path}.sha256"

  if [[ -z "$(docker_compose ps -q --status running web | tr -d '[:space:]')" ]]; then
    die "The web service is not running; start it before taking a backup"
  fi

  # The SQLite online backup API copies a consistent snapshot while the app
  # keeps writing; a plain copy of a live WAL database could be torn.
  CONTAINER_TEMP_PATH="/data/.harborstats-backup-${timestamp}.db"
  log "Taking an online backup of $CONTAINER_DATABASE_PATH"
  docker_compose exec -T web \
    sqlite3 -bail -cmd ".timeout 5000" "$CONTAINER_DATABASE_PATH" ".backup $CONTAINER_TEMP_PATH" >/dev/null

  log "Checking backup integrity"
  local integrity=""
  integrity="$(docker_compose exec -T web sqlite3 -bail "$CONTAINER_TEMP_PATH" "PRAGMA integrity_check;" 2>&1 | tr -d '\r')" ||
    die "Integrity check failed on the backup: $integrity"
  [[ "$integrity" == "ok" ]] || die "Integrity check failed on the backup: $integrity"

  # The checked file's hash, so the host copy is proven to be those bytes.
  local container_checksum=""
  container_checksum="$(docker_compose exec -T web sha256sum "$CONTAINER_TEMP_PATH" | awk '{ print $1 }')"

  LOCAL_TEMP_PATH="${final_backup_path}.tmp"
  log "Writing backup to $final_backup_path"
  docker_compose cp "web:$CONTAINER_TEMP_PATH" "$LOCAL_TEMP_PATH" >/dev/null

  local local_checksum=""
  local_checksum="$(sha256_of "$LOCAL_TEMP_PATH")"
  if [[ -z "$container_checksum" || "$local_checksum" != "$container_checksum" ]]; then
    die "Copied backup does not match the checked file (container ${container_checksum:-none}, host $local_checksum)"
  fi

  mv "$LOCAL_TEMP_PATH" "$final_backup_path"
  LOCAL_TEMP_PATH=""

  write_checksum "$final_backup_path" "$checksum_path"

  log "Pruning SQLite backups older than $RETENTION_DAYS days"
  prune_old_backups

  log "Backup complete: $final_backup_path"
}

main "$@"
