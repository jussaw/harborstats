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
  DATABASE_NAME \
  POSTGRES_USER \
  ADMIN_PASSWORD \
  ADMIN_SESSION_SECRET

COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/docker-compose.yml}"
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

confirm_restore() {
  local backup_path="$1"
  printf "About to restore '%s' into database '%s'.\n" "$backup_path" "$DATABASE_NAME"
  printf "This will stop the app and replace current production data.\n"
  printf "Type '%s' to continue: " "$DATABASE_NAME"

  local confirmation=""
  read -r confirmation

  if [[ "$confirmation" != "$DATABASE_NAME" ]]; then
    die "Confirmation did not match '$DATABASE_NAME'; aborting restore"
  fi
}

main() {
  ensure_command docker

  [[ $# -eq 1 ]] || die "Usage: ./devops/restore-db.sh /path/to/backup.dump"

  local backup_path="$1"
  [[ -f "$backup_path" ]] || die "Backup file does not exist: $backup_path"

  confirm_restore "$backup_path"

  log "Stopping web service"
  docker_compose stop web >/dev/null

  log "Starting database service"
  docker_compose up -d db >/dev/null

  log "Waiting for database health"
  wait_for_db_health

  log "Terminating active database connections"
  docker_compose exec -T db \
    psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 \
    -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DATABASE_NAME' AND pid <> pg_backend_pid();" \
    >/dev/null

  log "Dropping existing database"
  docker_compose exec -T db dropdb -U "$POSTGRES_USER" --if-exists "$DATABASE_NAME" >/dev/null

  log "Creating empty database"
  docker_compose exec -T db createdb -U "$POSTGRES_USER" "$DATABASE_NAME" >/dev/null

  log "Restoring backup from $backup_path"
  docker_compose exec -T db \
    pg_restore -U "$POSTGRES_USER" -d "$DATABASE_NAME" --clean --if-exists --no-owner --no-privileges \
    <"$backup_path"

  log "Running migrations"
  docker_compose run --build --rm migrate >/dev/null

  log "Starting web service"
  docker_compose up -d web >/dev/null

  log "Restore complete"
}

main "$@"
