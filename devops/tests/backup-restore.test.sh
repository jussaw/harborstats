#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$REPO_DIR/devops/docker-compose.yml"
DOCKERFILE="$REPO_DIR/web/Dockerfile"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

assert_file_exists() {
  local path="$1"
  [[ -f "$path" ]] || fail "Expected file to exist: $path"
}

assert_file_not_exists() {
  local path="$1"
  [[ ! -e "$path" ]] || fail "Expected path to be absent: $path"
}

assert_equals() {
  local expected="$1"
  local actual="$2"
  local message="${3:-Values differ}"
  [[ "$expected" == "$actual" ]] || fail "$message"$'\n'"Expected: $expected"$'\n'"Actual:   $actual"
}

assert_contains() {
  local needle="$1"
  local path="$2"
  grep -F -- "$needle" "$path" >/dev/null || fail "Expected '$needle' in $path"
}

assert_not_contains() {
  local needle="$1"
  local path="$2"
  ! grep -F -- "$needle" "$path" >/dev/null || fail "Did not expect '$needle' in $path"
}

setup_test_dir() {
  TEST_DIR="$(mktemp -d)"
  export TEST_DIR
  export STUB_BIN="$TEST_DIR/bin"
  export BACKUP_DIR="$TEST_DIR/backups"
  export COMPOSE_FILE
  export EXPECTED_COMPOSE_PREFIX="compose -f $COMPOSE_FILE"
  export DOCKER_LOG="$TEST_DIR/docker.log"
  export DOCKER_ENV_LOG="$TEST_DIR/docker-env.log"
  export GIT_LOG="$TEST_DIR/git.log"
  # What `docker compose cp web:<backup> <dest>` hands back from the container.
  export SQLITE_BACKUP_SOURCE="$TEST_DIR/sqlite_backup_source.db"
  export WEB_RUNNING=1
  export INTEGRITY_RESULT=ok
  export CONTAINER_SHA256=deadbeef
  mkdir -p "$STUB_BIN" "$BACKUP_DIR"
  : >"$DOCKER_LOG"
  : >"$DOCKER_ENV_LOG"
  : >"$GIT_LOG"
}

cleanup_test_dir() {
  if [[ -n "${TEST_DIR:-}" && -d "${TEST_DIR:-}" ]]; then
    rm -rf "$TEST_DIR"
  fi
}

write_sqlite_fixture() {
  # A real SQLite file starts with this 16-byte header.
  printf 'SQLite format 3\000%s\n' "$2" >"$1"
}

write_docker_stub() {
  cat >"$STUB_BIN/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >> "$DOCKER_LOG"
printf 'ADMIN_PASSWORD=%s\n' "${ADMIN_PASSWORD:-}" >> "$DOCKER_ENV_LOG"
printf 'ADMIN_SESSION_SECRET=%s\n' "${ADMIN_SESSION_SECRET:-}" >> "$DOCKER_ENV_LOG"

args="$*"
prefix="$EXPECTED_COMPOSE_PREFIX"

if [[ "$args" == "$prefix stop web" ]]; then
  exit 0
fi

if [[ "$args" == "$prefix up -d web" ]]; then
  exit 0
fi

if [[ "$args" == "$prefix up --build -d web" ]]; then
  exit 0
fi

if [[ "$args" == "$prefix ps -q --status running web" ]]; then
  if [[ "$WEB_RUNNING" == "1" ]]; then
    printf 'web-container\n'
  fi
  exit 0
fi

if [[ "$args" == "$prefix exec -T web sqlite3 "*"VACUUM INTO "* ]]; then
  exit 0
fi

if [[ "$args" == "$prefix exec -T web sqlite3 "*"PRAGMA integrity_check"* ]]; then
  printf '%s\n' "$INTEGRITY_RESULT"
  exit 0
fi

if [[ "$args" == "$prefix exec -T web sha256sum "* ]]; then
  printf '%s  %s\n' "$CONTAINER_SHA256" "${*: -1}"
  exit 0
fi

if [[ "$args" == "$prefix exec -T web rm -f "* ]]; then
  exit 0
fi

if [[ "$args" == "$prefix cp web:"* ]]; then
  cp "$SQLITE_BACKUP_SOURCE" "${*: -1}"
  exit 0
fi

if [[ "$args" == "$prefix run --rm -T --no-deps --user root -v "* ]]; then
  exit 0
fi

echo "Unhandled docker invocation: $args" >&2
exit 1
EOF
  chmod +x "$STUB_BIN/docker"
}

write_git_stub() {
  cat >"$STUB_BIN/git" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >> "$GIT_LOG"

if [[ "$*" == "-C "*" pull" ]]; then
  exit 0
fi

echo "Unhandled git invocation: $*" >&2
exit 1
EOF
  chmod +x "$STUB_BIN/git"
}

write_checksum_stub() {
  cat >"$STUB_BIN/sha256sum" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'deadbeef  %s\n' "$1"
EOF
  chmod +x "$STUB_BIN/sha256sum"
}

# The compose subcommands the stubbed scripts ran, in order, e.g. "stop run up".
compose_subcommands() {
  local line
  local subcommands=()
  while IFS= read -r line; do
    if [[ "$line" == "$EXPECTED_COMPOSE_PREFIX "* ]]; then
      line="${line#"$EXPECTED_COMPOSE_PREFIX "}"
      subcommands+=("${line%% *}")
    fi
  done <"$DOCKER_LOG"
  printf '%s\n' "${subcommands[*]}"
}

run_backup_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  write_sqlite_fixture "$SQLITE_BACKUP_SOURCE" "backup fixture"

  local old_db="$BACKUP_DIR/harborstats-20000101T000000Z.db"
  local old_db_checksum="$old_db.sha256"
  local old_dump="$BACKUP_DIR/harborstats-20000101T000000Z.dump"
  local old_dump_checksum="$old_dump.sha256"
  printf 'old db\n' >"$old_db"
  printf 'old db checksum\n' >"$old_db_checksum"
  printf 'old postgres dump\n' >"$old_dump"
  printf 'old dump checksum\n' >"$old_dump_checksum"
  touch -t 200001010000 "$old_db" "$old_db_checksum" "$old_dump" "$old_dump_checksum"

  local output
  if ! output="$(PATH="$STUB_BIN:$PATH" BACKUP_DIR="$BACKUP_DIR" RETENTION_DAYS=30 "$REPO_DIR/devops/backup-db.sh" 2>&1)"; then
    echo "$output" >&2
    fail "backup-db.sh exited non-zero"
  fi

  local db_path
  db_path="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'harborstats-*.db' | sort)"
  [[ -n "$db_path" ]] || fail "Expected one new .db backup"
  [[ "$(printf '%s\n' "$db_path" | wc -l | tr -d '[:space:]')" == "1" ]] || fail "Expected one .db backup, got: $db_path"
  [[ "$(basename "$db_path")" =~ ^harborstats-[0-9]{8}T[0-9]{6}Z\.db$ ]] || fail "Unexpected backup name: $db_path"

  assert_file_exists "$db_path.sha256"
  cmp -s "$SQLITE_BACKUP_SOURCE" "$db_path" || fail "Backup content differs from the container copy"
  assert_contains "deadbeef  $db_path" "$db_path.sha256"

  assert_file_not_exists "$old_db"
  assert_file_not_exists "$old_db_checksum"
  # Pre-SQLite Postgres dumps are never pruned by the SQLite backup.
  assert_file_exists "$old_dump"
  assert_file_exists "$old_dump_checksum"
  [[ -z "$(find "$BACKUP_DIR" -name '*.tmp')" ]] || fail "Temporary files left in $BACKUP_DIR"

  assert_contains "$EXPECTED_COMPOSE_PREFIX ps -q --status running web" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T web sqlite3 -bail -cmd .timeout 5000 /data/harborstats.db VACUUM INTO '/data/.harborstats-backup-" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T web sqlite3 -bail /data/.harborstats-backup-" "$DOCKER_LOG"
  assert_contains "PRAGMA integrity_check" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX cp web:/data/.harborstats-backup-" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T web rm -f /data/.harborstats-backup-" "$DOCKER_LOG"
  assert_not_contains " db " "$DOCKER_LOG"
  assert_not_contains "pg_dump" "$DOCKER_LOG"
}

run_backup_integrity_failure_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  write_sqlite_fixture "$SQLITE_BACKUP_SOURCE" "torn backup"
  export INTEGRITY_RESULT=$'*** in database main ***\nPage 5: btreeInitPage() returns error code 11'

  set +e
  local output
  output="$(PATH="$STUB_BIN:$PATH" BACKUP_DIR="$BACKUP_DIR" "$REPO_DIR/devops/backup-db.sh" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "backup-db.sh should fail when the integrity check is not ok"
  [[ "$output" == *"Integrity check failed"* ]] || fail "Expected integrity failure message, got: $output"
  [[ -z "$(find "$BACKUP_DIR" -name 'harborstats-*.db*')" ]] || fail "A failed backup must leave no .db in $BACKUP_DIR"
  [[ -z "$(find "$BACKUP_DIR" -name '*.tmp')" ]] || fail "Temporary files left in $BACKUP_DIR"
  assert_not_contains " cp web:" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T web rm -f /data/.harborstats-backup-" "$DOCKER_LOG"
}

run_backup_copy_mismatch_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  write_sqlite_fixture "$SQLITE_BACKUP_SOURCE" "fixture"
  export CONTAINER_SHA256=cafebabe

  set +e
  local output
  output="$(PATH="$STUB_BIN:$PATH" BACKUP_DIR="$BACKUP_DIR" "$REPO_DIR/devops/backup-db.sh" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "backup-db.sh should fail when the host copy differs from the checked file"
  [[ "$output" == *"does not match"* ]] || fail "Expected copy mismatch message, got: $output"
  [[ -z "$(find "$BACKUP_DIR" -name 'harborstats-*.db*')" ]] || fail "A failed backup must leave no .db in $BACKUP_DIR"
  [[ -z "$(find "$BACKUP_DIR" -name '*.tmp')" ]] || fail "Temporary files left in $BACKUP_DIR"
}

run_backup_requires_running_web_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  export WEB_RUNNING=0

  set +e
  local output
  output="$(PATH="$STUB_BIN:$PATH" BACKUP_DIR="$BACKUP_DIR" "$REPO_DIR/devops/backup-db.sh" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "backup-db.sh should fail when web is not running"
  [[ "$output" == *"web service is not running"* ]] || fail "Expected not-running message, got: $output"
  assert_not_contains "sqlite3" "$DOCKER_LOG"
  [[ -z "$(find "$BACKUP_DIR" -name 'harborstats-*.db*')" ]] || fail "A failed backup must leave no .db in $BACKUP_DIR"
}

run_restore_rejects_bad_confirmation_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  write_sqlite_fixture "$TEST_DIR/sample.db" "restore fixture"

  set +e
  local output
  output="$(printf 'nope\n' | PATH="$STUB_BIN:$PATH" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/sample.db" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "restore-db.sh should fail when confirmation is wrong"
  [[ ! -s "$DOCKER_LOG" ]] || fail "restore-db.sh should not call docker when confirmation is wrong"
  [[ "$output" == *"Confirmation did not match"* ]] || fail "Expected confirmation failure message"
}

run_restore_rejects_checksum_mismatch_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  write_sqlite_fixture "$TEST_DIR/sample.db" "restore fixture"
  printf 'cafebabe  %s\n' "$TEST_DIR/sample.db" >"$TEST_DIR/sample.db.sha256"

  set +e
  local output
  output="$(printf 'harborstats\n' | PATH="$STUB_BIN:$PATH" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/sample.db" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "restore-db.sh should fail when the checksum does not match"
  [[ ! -s "$DOCKER_LOG" ]] || fail "restore-db.sh should not call docker when the checksum does not match"
  [[ "$output" == *"Checksum mismatch"* ]] || fail "Expected checksum mismatch message, got: $output"
}

run_restore_rejects_non_sqlite_file_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  printf 'PGDMP postgres custom-format dump\n' >"$TEST_DIR/harborstats-20261112T055548Z.dump"

  set +e
  local output
  output="$(printf 'harborstats\n' | PATH="$STUB_BIN:$PATH" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/harborstats-20261112T055548Z.dump" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "restore-db.sh should refuse a file that is not a SQLite database"
  [[ ! -s "$DOCKER_LOG" ]] || fail "restore-db.sh should not call docker for a non-SQLite file"
  [[ "$output" == *"not a SQLite database"* ]] || fail "Expected non-SQLite message, got: $output"
}

run_restore_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  local backup_name="harborstats-20261112T080000Z.db"
  write_sqlite_fixture "$TEST_DIR/$backup_name" "restore fixture"
  printf 'deadbeef  %s\n' "$TEST_DIR/$backup_name" >"$TEST_DIR/$backup_name.sha256"

  # A relative path must reach the bind mount as an absolute one.
  local output
  if ! output="$(cd "$TEST_DIR" && printf 'harborstats\n' | PATH="$STUB_BIN:$PATH" "$REPO_DIR/devops/restore-db.sh" "./$backup_name" 2>&1)"; then
    echo "$output" >&2
    fail "restore-db.sh exited non-zero"
  fi

  local abs_backup_path
  abs_backup_path="$(cd "$TEST_DIR" && pwd -P)/$backup_name"
  assert_equals "stop run up" "$(compose_subcommands)" "restore-db.sh should stop web, replace the file, then start web"
  assert_contains "$EXPECTED_COMPOSE_PREFIX stop web" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX run --rm -T --no-deps --user root -v $abs_backup_path:/restore/harborstats.db:ro web sh -euc" "$DOCKER_LOG"
  assert_contains "cp /restore/harborstats.db /data/.harborstats-restore.db" "$DOCKER_LOG"
  assert_contains "chown 1001:1001 /data/.harborstats-restore.db" "$DOCKER_LOG"
  assert_contains "rm -f /data/harborstats.db-wal /data/harborstats.db-shm" "$DOCKER_LOG"
  assert_contains "mv /data/.harborstats-restore.db /data/harborstats.db" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX up -d web" "$DOCKER_LOG"
  assert_not_contains "DATABASE_ALLOW_CREATE" "$DOCKER_LOG"
  assert_not_contains "migrate" "$DOCKER_LOG"
  [[ "$output" == *"Checksum verified"* ]] || fail "Expected the checksum to be verified, got: $output"
}

run_env_file_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub

  export ENV_FILE="$TEST_DIR/devops.env"
  export EXPECTED_COMPOSE_PREFIX="compose --env-file $ENV_FILE -f $COMPOSE_FILE"
  unset BACKUP_DIR

  local env_backup_dir="$TEST_DIR/from-env"
  cat >"$ENV_FILE" <<EOF
BACKUP_DIR=$env_backup_dir
ADMIN_PASSWORD=env-admin-password
ADMIN_SESSION_SECRET=env-admin-session-secret
EOF

  write_sqlite_fixture "$SQLITE_BACKUP_SOURCE" "env file backup fixture"

  local backup_output
  if ! backup_output="$(PATH="$STUB_BIN:$PATH" ENV_FILE="$ENV_FILE" "$REPO_DIR/devops/backup-db.sh" 2>&1)"; then
    echo "$backup_output" >&2
    fail "backup-db.sh should load values from ENV_FILE"
  fi

  local db_path
  db_path="$(find "$env_backup_dir" -maxdepth 1 -type f -name 'harborstats-*.db' | sort)"
  [[ -n "$db_path" ]] || fail "Expected the backup in the ENV_FILE BACKUP_DIR"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T web sqlite3 -bail -cmd .timeout 5000 /data/harborstats.db VACUUM INTO " "$DOCKER_LOG"
  assert_contains "ADMIN_SESSION_SECRET=env-admin-session-secret" "$DOCKER_ENV_LOG"

  : >"$DOCKER_LOG"
  write_sqlite_fixture "$TEST_DIR/env-sample.db" "restore fixture from env"

  local restore_output
  if ! restore_output="$(printf 'harborstats\n' | PATH="$STUB_BIN:$PATH" ENV_FILE="$ENV_FILE" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/env-sample.db" 2>&1)"; then
    echo "$restore_output" >&2
    fail "restore-db.sh should load values from ENV_FILE"
  fi

  assert_equals "stop run up" "$(compose_subcommands)" "restore-db.sh should use the ENV_FILE compose prefix"
}

run_deploy_env_file_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_git_stub

  export ENV_FILE="$TEST_DIR/deploy.env"
  export EXPECTED_COMPOSE_PREFIX="compose --env-file $ENV_FILE -f $COMPOSE_FILE"
  unset ADMIN_SESSION_SECRET

  cat >"$ENV_FILE" <<EOF
ADMIN_PASSWORD=env-admin-password
ADMIN_SESSION_SECRET=env-admin-session-secret
EOF

  local output
  if ! output="$(PATH="$STUB_BIN:$PATH" ENV_FILE="$ENV_FILE" ADMIN_PASSWORD=shell-admin-password "$REPO_DIR/devops/deploy.sh" 2>&1)"; then
    echo "$output" >&2
    fail "deploy.sh should load ENV_FILE defaults and preserve explicit shell overrides"
  fi

  assert_contains "-C $REPO_DIR pull" "$GIT_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX up --build -d web" "$DOCKER_LOG"
  assert_equals "1" "$(wc -l <"$DOCKER_LOG" | tr -d '[:space:]')" "deploy.sh should make exactly one docker call"
  assert_not_contains " db" "$DOCKER_LOG"
  assert_not_contains "migrate" "$DOCKER_LOG"
  assert_not_contains "baseline" "$DOCKER_LOG"
  assert_not_contains "pgadmin" "$DOCKER_LOG"
  assert_not_contains "--remove-orphans" "$DOCKER_LOG"
  assert_contains "ADMIN_PASSWORD=shell-admin-password" "$DOCKER_ENV_LOG"
  assert_contains "ADMIN_SESSION_SECRET=env-admin-session-secret" "$DOCKER_ENV_LOG"
}

run_compose_single_web_service_test() {
  # One container on SQLite: no Postgres, migrator or pgAdmin services, and the
  # database lives in a named volume whose name does not depend on the project.
  assert_contains 'container_name: harborstats-web' "$COMPOSE_FILE"
  assert_contains '"23413:3000"' "$COMPOSE_FILE"
  assert_contains 'DATABASE_PATH: /data/harborstats.db' "$COMPOSE_FILE"
  assert_contains 'DATABASE_ALLOW_CREATE: ${DATABASE_ALLOW_CREATE:-}' "$COMPOSE_FILE"
  assert_contains 'harborstats_data:/data' "$COMPOSE_FILE"
  assert_contains 'name: harborstats_data' "$COMPOSE_FILE"
  assert_not_contains 'postgres' "$COMPOSE_FILE"
  assert_not_contains 'DATABASE_URL' "$COMPOSE_FILE"
  assert_not_contains 'pgdata' "$COMPOSE_FILE"
  assert_not_contains 'pgadmin' "$COMPOSE_FILE"
  assert_not_contains 'migrator' "$COMPOSE_FILE"
  assert_not_contains 'AS migrator' "$DOCKERFILE"
  assert_contains 'ENV DATABASE_PATH=/data/harborstats.db' "$DOCKERFILE"
  assert_contains 'db/migrations ./db/migrations' "$DOCKERFILE"
  # The preinstall hook runs this script, so the deps stage must copy it first.
  assert_contains 'COPY scripts/check-node-version.ts ./scripts/' "$DOCKERFILE"
  # backup-db.sh runs the sqlite3 CLI inside the web container.
  assert_contains 'apk add --no-cache sqlite' "$DOCKERFILE"

  if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    echo "SKIP: docker compose unavailable; skipping rendered compose service checks" >&2
    return 0
  fi

  setup_test_dir
  trap cleanup_test_dir RETURN
  local empty_env="$TEST_DIR/empty.env"
  : >"$empty_env"

  local services
  services="$(
    ADMIN_PASSWORD=test-admin \
      ADMIN_SESSION_SECRET=test-session-secret \
      docker compose --env-file "$empty_env" -f "$COMPOSE_FILE" config --services
  )"
  assert_equals "web" "$services" "Compose should define exactly one service"

  local volumes
  volumes="$(
    ADMIN_PASSWORD=test-admin \
      ADMIN_SESSION_SECRET=test-session-secret \
      docker compose --env-file "$empty_env" -f "$COMPOSE_FILE" config --volumes
  )"
  assert_equals "harborstats_data" "$volumes" "Compose should define exactly one volume"

  local rendered
  rendered="$(
    env -u DATABASE_ALLOW_CREATE \
      ADMIN_PASSWORD=test-admin \
      ADMIN_SESSION_SECRET=test-session-secret \
      docker compose --env-file "$empty_env" -f "$COMPOSE_FILE" config
  )"
  assert_equals 'DATABASE_ALLOW_CREATE: ""' \
    "$(printf '%s\n' "$rendered" | sed -n -E 's/^[[:space:]]*(DATABASE_ALLOW_CREATE:.*)$/\1/p')" \
    "DATABASE_ALLOW_CREATE should render empty unless set"
}

render_admin_session_version() {
  local env_file="$1"
  local value="$2"
  local rendered

  if [[ "$value" == "__unset__" ]]; then
    rendered="$(
      env -u ADMIN_SESSION_VERSION \
        ADMIN_PASSWORD=test-admin \
        ADMIN_SESSION_SECRET=test-session-secret \
        docker compose --env-file "$env_file" -f "$COMPOSE_FILE" config
    )"
  else
    rendered="$(
      ADMIN_PASSWORD=test-admin \
        ADMIN_SESSION_SECRET=test-session-secret \
        ADMIN_SESSION_VERSION="$value" \
        docker compose --env-file "$env_file" -f "$COMPOSE_FILE" config
    )"
  fi

  printf '%s\n' "$rendered" |
    sed -n -E 's/^[[:space:]]*ADMIN_SESSION_VERSION:[[:space:]]*"?([^"]*)"?[[:space:]]*$/\1/p'
}

run_admin_session_version_test() {
  # The deployed web service must receive the admin session-version lever, and
  # an unset or empty value must fall back to "1" rather than reaching the app
  # as an empty string (which would silently invalidate every admin session).
  assert_contains 'ADMIN_SESSION_VERSION: ${ADMIN_SESSION_VERSION:-1}' "$COMPOSE_FILE"

  if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
    echo "SKIP: docker compose unavailable; skipping rendered ADMIN_SESSION_VERSION checks" >&2
    return 0
  fi

  setup_test_dir
  trap cleanup_test_dir RETURN

  # Render against an empty env file so the assertions never depend on a real
  # devops/.env on the host.
  local empty_env="$TEST_DIR/empty.env"
  : >"$empty_env"

  assert_equals "1" "$(render_admin_session_version "$empty_env" "__unset__")" \
    "Unset ADMIN_SESSION_VERSION should render as 1"
  assert_equals "7" "$(render_admin_session_version "$empty_env" "7")" \
    "Explicit ADMIN_SESSION_VERSION should render as given"
  assert_equals "1" "$(render_admin_session_version "$empty_env" "")" \
    "Empty ADMIN_SESSION_VERSION should render as 1"
}

run_migration_scripts_exit_nonzero_test() {
  # /dev/null is a file, so the database directory can never be created.
  local bad_database_path="/dev/null/harborstats.db"

  set +e
  local migrate_output
  migrate_output="$(cd "$REPO_DIR/web" && DATABASE_PATH="$bad_database_path" ./node_modules/.bin/tsx scripts/migrate.ts 2>&1)"
  local migrate_status=$?
  set -e
  [[ $migrate_status -ne 0 ]] || fail "migrate.ts should exit non-zero when migration fails"$'\n'"$migrate_output"
}

main() {
  run_backup_test
  run_backup_integrity_failure_test
  run_backup_copy_mismatch_test
  run_backup_requires_running_web_test
  run_restore_rejects_bad_confirmation_test
  run_restore_rejects_checksum_mismatch_test
  run_restore_rejects_non_sqlite_file_test
  run_restore_test
  run_env_file_test
  run_deploy_env_file_test
  run_compose_single_web_service_test
  run_admin_session_version_test
  run_migration_scripts_exit_nonzero_test
  echo "backup-restore tests passed"
}

main "$@"
