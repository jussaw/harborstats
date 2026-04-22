#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$REPO_DIR/devops/docker-compose.yml"

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

setup_test_dir() {
  TEST_DIR="$(mktemp -d)"
  export TEST_DIR
  export STUB_BIN="$TEST_DIR/bin"
  export BACKUP_DIR="$TEST_DIR/backups"
  export COMPOSE_FILE
  export EXPECTED_COMPOSE_PREFIX="compose -f $COMPOSE_FILE"
  export DOCKER_LOG="$TEST_DIR/docker.log"
  export PG_DUMP_SOURCE="$TEST_DIR/pg_dump_source.dump"
  export PG_RESTORE_CAPTURE="$TEST_DIR/pg_restore_capture.dump"
  mkdir -p "$STUB_BIN" "$BACKUP_DIR"
  : >"$DOCKER_LOG"
}

cleanup_test_dir() {
  if [[ -n "${TEST_DIR:-}" && -d "${TEST_DIR:-}" ]]; then
    rm -rf "$TEST_DIR"
  fi
}

write_docker_stub() {
  cat >"$STUB_BIN/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf '%s\n' "$*" >> "$DOCKER_LOG"

args="$*"

if [[ "$args" == "$EXPECTED_COMPOSE_PREFIX up -d db" ]]; then
  exit 0
fi

if [[ "$args" == "$EXPECTED_COMPOSE_PREFIX ps -q db" ]]; then
  printf 'db-container\n'
  exit 0
fi

if [[ "$args" == inspect\ --format*' db-container' ]]; then
  printf 'healthy\n'
  exit 0
fi

if [[ "$args" == "$EXPECTED_COMPOSE_PREFIX stop web" ]]; then
  exit 0
fi

if [[ "$args" == "$EXPECTED_COMPOSE_PREFIX up -d web" ]]; then
  exit 0
fi

if [[ "$args" == "$EXPECTED_COMPOSE_PREFIX run --build --rm migrate" ]]; then
  exit 0
fi

if [[ "$args" == *" exec -T db pg_dump "* ]]; then
  cat "$PG_DUMP_SOURCE"
  exit 0
fi

if [[ "$args" == *" exec -T db pg_restore "* ]]; then
  cat >"$PG_RESTORE_CAPTURE"
  exit 0
fi

if [[ "$args" == *" exec -T db psql "* ]]; then
  exit 0
fi

if [[ "$args" == *" exec -T db dropdb "* ]]; then
  exit 0
fi

if [[ "$args" == *" exec -T db createdb "* ]]; then
  exit 0
fi

echo "Unhandled docker invocation: $args" >&2
exit 1
EOF
  chmod +x "$STUB_BIN/docker"
}

write_checksum_stub() {
  cat >"$STUB_BIN/sha256sum" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail

printf 'deadbeef  %s\n' "$1"
EOF
  chmod +x "$STUB_BIN/sha256sum"
}

run_backup_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub

  printf 'logical backup fixture\n' >"$PG_DUMP_SOURCE"

  local old_dump="$BACKUP_DIR/harborstats-20000101T000000Z.dump"
  local old_checksum="$old_dump.sha256"
  printf 'old data\n' >"$old_dump"
  printf 'old checksum\n' >"$old_checksum"
  touch -t 200001010000 "$old_dump" "$old_checksum"

  local output
  if ! output="$(PATH="$STUB_BIN:$PATH" BACKUP_DIR="$BACKUP_DIR" RETENTION_DAYS=30 "$REPO_DIR/devops/backup-db.sh" 2>&1)"; then
    echo "$output" >&2
    fail "backup-db.sh exited non-zero"
  fi

  local dump_path
  dump_path="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'harborstats-*.dump' | sort)"
  [[ -n "$dump_path" ]] || fail "Expected one retained dump file"
  [[ "$(printf '%s\n' "$dump_path" | wc -l | tr -d '[:space:]')" == "1" ]] || fail "Expected one retained dump file"

  local checksum_path="$dump_path.sha256"
  assert_file_exists "$dump_path"
  assert_file_exists "$checksum_path"
  assert_file_not_exists "$old_dump"
  assert_file_not_exists "$old_checksum"
  assert_contains "$EXPECTED_COMPOSE_PREFIX up -d db" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX ps -q db" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db pg_dump -U postgres -d harborstats --format=custom --compress=9 --no-owner --no-privileges" "$DOCKER_LOG"
  assert_equals "$(cat "$PG_DUMP_SOURCE")" "$(cat "$dump_path")" "Backup dump content mismatch"
  assert_contains "deadbeef  $dump_path" "$checksum_path"
}

run_restore_rejects_bad_confirmation_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  printf 'restore fixture\n' >"$TEST_DIR/sample.dump"

  set +e
  local output
  output="$(printf 'nope\n' | PATH="$STUB_BIN:$PATH" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/sample.dump" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "restore-db.sh should fail when confirmation is wrong"
  [[ ! -s "$DOCKER_LOG" ]] || fail "restore-db.sh should not call docker when confirmation is wrong"
  [[ "$output" == *"Confirmation did not match"* ]] || fail "Expected confirmation failure message"
}

run_restore_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  printf 'restore fixture\n' >"$TEST_DIR/sample.dump"

  local output
  if ! output="$(printf 'harborstats\n' | PATH="$STUB_BIN:$PATH" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/sample.dump" 2>&1)"; then
    echo "$output" >&2
    fail "restore-db.sh exited non-zero"
  fi

  assert_contains "$EXPECTED_COMPOSE_PREFIX stop web" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX up -d db" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c SELECT pg_terminate_backend(pid)" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db dropdb -U postgres --if-exists harborstats" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db createdb -U postgres harborstats" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db pg_restore -U postgres -d harborstats --clean --if-exists --no-owner --no-privileges" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX run --build --rm migrate" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX up -d web" "$DOCKER_LOG"
  assert_equals "$(cat "$TEST_DIR/sample.dump")" "$(cat "$PG_RESTORE_CAPTURE")" "Restore input mismatch"
}

run_env_file_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub

  export ENV_FILE="$TEST_DIR/devops.env"
  export EXPECTED_COMPOSE_PREFIX="compose --env-file $ENV_FILE -f $COMPOSE_FILE"
  unset BACKUP_DIR DATABASE_NAME POSTGRES_USER

  local env_backup_dir="$TEST_DIR/from-env"
  cat >"$ENV_FILE" <<EOF
BACKUP_DIR=$env_backup_dir
DATABASE_NAME=backup_archive
POSTGRES_USER=archive_user
ADMIN_PASSWORD=env-admin-password
ADMIN_SESSION_SECRET=env-admin-session-secret
EOF

  printf 'env file backup fixture\n' >"$PG_DUMP_SOURCE"
  mkdir -p "$env_backup_dir"

  local backup_output
  if ! backup_output="$(PATH="$STUB_BIN:$PATH" ENV_FILE="$ENV_FILE" "$REPO_DIR/devops/backup-db.sh" 2>&1)"; then
    echo "$backup_output" >&2
    fail "backup-db.sh should load values from ENV_FILE"
  fi

  local dump_path
  dump_path="$(find "$env_backup_dir" -maxdepth 1 -type f -name 'backup_archive-*.dump' | sort)"
  [[ -n "$dump_path" ]] || fail "Expected env-file-configured backup dump"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db pg_dump -U archive_user -d backup_archive --format=custom --compress=9 --no-owner --no-privileges" "$DOCKER_LOG"

  : >"$DOCKER_LOG"
  printf 'restore fixture from env\n' >"$TEST_DIR/env-sample.dump"

  local restore_output
  if ! restore_output="$(printf 'backup_archive\n' | PATH="$STUB_BIN:$PATH" ENV_FILE="$ENV_FILE" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/env-sample.dump" 2>&1)"; then
    echo "$restore_output" >&2
    fail "restore-db.sh should load values from ENV_FILE"
  fi

  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db dropdb -U archive_user --if-exists backup_archive" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db createdb -U archive_user backup_archive" "$DOCKER_LOG"
  assert_contains "$EXPECTED_COMPOSE_PREFIX exec -T db pg_restore -U archive_user -d backup_archive --clean --if-exists --no-owner --no-privileges" "$DOCKER_LOG"
}

main() {
  run_backup_test
  run_restore_rejects_bad_confirmation_test
  run_restore_test
  run_env_file_test
  echo "backup-restore tests passed"
}

main "$@"
