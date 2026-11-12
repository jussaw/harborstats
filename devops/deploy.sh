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
STARTUP_TIMEOUT_SECONDS="${STARTUP_TIMEOUT_SECONDS:-120}"

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

# Migrations run inside the container after `up -d` has returned, so a failed
# migration or a refused database shows only in the container: wait for the
# app's startup line instead of trusting `up`.
wait_for_web_startup() {
  local since="$1"
  local deadline=$((SECONDS + STARTUP_TIMEOUT_SECONDS))
  local container_id=""
  local inspected=""
  local state=""
  local started_at=""
  local logs=""

  while :; do
    container_id="$(docker_compose ps -a -q web | tr -d '[:space:]')"
    inspected=""
    if [[ -n "$container_id" ]]; then
      inspected="$(docker inspect --format '{{.State.Status}} {{.State.StartedAt}}' "$container_id" 2>/dev/null || true)"
    fi
    state="${inspected%% *}"
    started_at="${inspected#* }"

    # `up` left an unchanged container alone: it is the earlier, healthy process.
    if [[ "$state" == "running" && -n "$started_at" && "${started_at:0:19}" < "${since:0:19}" ]]; then
      log "web was already running and was not restarted"
      return 0
    fi

    logs="$(docker_compose logs --since "$since" --no-log-prefix web 2>&1 || true)"
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

echo "==> Pulling latest changes..."
git -C "$REPO_DIR" pull

echo "==> Building and starting web..."
since="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
docker_compose up --build -d web

echo "==> Waiting for web to start (migrations run at startup)..."
wait_for_web_startup "$since"

echo "==> Done."
