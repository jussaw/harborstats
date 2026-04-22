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
  DATABASE_NAME \
  POSTGRES_USER \
  ADMIN_PASSWORD \
  ADMIN_SESSION_SECRET

COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/harborstats}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATABASE_NAME="${DATABASE_NAME:-harborstats}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

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

cleanup_temp_file() {
  if [[ -n "${TEMP_DUMP_PATH:-}" && -f "${TEMP_DUMP_PATH:-}" ]]; then
    rm -f "$TEMP_DUMP_PATH"
  fi
}

trap cleanup_temp_file EXIT

ensure_command() {
  command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"
}

wait_for_db_health() {
  local container_id=""
  local health_status=""
  local attempt

  for attempt in {1..30}; do
    container_id="$(docker_compose ps -q db | tr -d '[:space:]')"
    if [[ -n "$container_id" ]]; then
      health_status="$(
        docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}unknown{{end}}' "$container_id" \
          | tr -d '[:space:]'
      )"

      if [[ "$health_status" == "healthy" || "$health_status" == "running" ]]; then
        return 0
      fi
    fi

    sleep 2
  done

  die "Database service did not become healthy (last status: ${health_status:-missing})"
}

write_checksum() {
  local dump_path="$1"
  local checksum_path="$2"
  local temp_checksum_path="${checksum_path}.tmp"

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$dump_path" >"$temp_checksum_path"
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$dump_path" >"$temp_checksum_path"
  else
    log "No checksum utility found; skipping .sha256 generation"
    return 0
  fi

  mv "$temp_checksum_path" "$checksum_path"
}

prune_old_backups() {
  find "$BACKUP_DIR" -maxdepth 1 -type f \
    \( -name "${DATABASE_NAME}-*.dump" -o -name "${DATABASE_NAME}-*.dump.sha256" \) \
    -mtime "+$RETENTION_DAYS" -delete
}

main() {
  ensure_command docker
  mkdir -p "$BACKUP_DIR"

  local timestamp
  timestamp="$(date -u '+%Y%m%dT%H%M%SZ')"

  local final_dump_path="$BACKUP_DIR/${DATABASE_NAME}-${timestamp}.dump"
  TEMP_DUMP_PATH="${final_dump_path}.tmp"
  local checksum_path="${final_dump_path}.sha256"

  log "Starting database service"
  docker_compose up -d db >/dev/null

  log "Waiting for database health"
  wait_for_db_health

  log "Writing backup to $final_dump_path"
  docker_compose exec -T db \
    pg_dump -U "$POSTGRES_USER" -d "$DATABASE_NAME" --format=custom --compress=9 --no-owner --no-privileges \
    >"$TEMP_DUMP_PATH"

  mv "$TEMP_DUMP_PATH" "$final_dump_path"
  TEMP_DUMP_PATH=""

  write_checksum "$final_dump_path" "$checksum_path"

  log "Pruning backups older than $RETENTION_DAYS days"
  prune_old_backups

  log "Backup complete: $final_dump_path"
}

main "$@"
