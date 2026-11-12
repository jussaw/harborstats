#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
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
  # backup-db.sh and restore-db.sh address the app container by name. The
  # scripts let a shell value win over ENV_FILE, so an inherited one would mask
  # what ENV_FILE provides.
  export EXPECTED_CONTAINER=harborstats-web
  unset CONTAINER_NAME
  export DOCKER_LOG="$TEST_DIR/docker.log"
  # What `docker cp <container>:<backup> <dest>` hands back from the container.
  export SQLITE_BACKUP_SOURCE="$TEST_DIR/sqlite_backup_source.db"
  export WEB_EXISTS=1
  export WEB_RUNNING=1
  export INTEGRITY_RESULT=ok
  export CONTAINER_SHA256=deadbeef
  # What the stubbed web container reports after it is started.
  export WEB_STATE=running
  export WEB_LOGS="[startup] Opened the existing database at /data/harborstats.db"
  export STARTUP_TIMEOUT_SECONDS=0
  mkdir -p "$STUB_BIN" "$BACKUP_DIR"
  : >"$DOCKER_LOG"
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

# One line per call: the restore script argument spans several lines.
printf '%s\n' "${*//$'\n'/ }" >> "$DOCKER_LOG"

args="$*"
c="$EXPECTED_CONTAINER"

if [[ "$args" == "inspect --format {{.State.Running}} $c" ]]; then
  [[ "$WEB_EXISTS" == "1" ]] || { echo "Error: No such object: $c" >&2; exit 1; }
  if [[ "$WEB_RUNNING" == "1" ]]; then printf 'true\n'; else printf 'false\n'; fi
  exit 0
fi

if [[ "$args" == "inspect --format {{.Image}} $c" ]]; then
  [[ "$WEB_EXISTS" == "1" ]] || { echo "Error: No such object: $c" >&2; exit 1; }
  printf 'sha256:0123456789abcdef\n'
  exit 0
fi

if [[ "$args" == "inspect --format {{.State.Status}} $c" ]]; then
  printf '%s\n' "$WEB_STATE"
  exit 0
fi

if [[ "$args" == "exec $c sqlite3 "*"VACUUM INTO "* ]]; then
  exit 0
fi

if [[ "$args" == "exec $c sqlite3 "*"PRAGMA integrity_check"* ]]; then
  printf '%s\n' "$INTEGRITY_RESULT"
  exit 0
fi

if [[ "$args" == "exec $c sha256sum "* ]]; then
  printf '%s  %s\n' "$CONTAINER_SHA256" "${*: -1}"
  exit 0
fi

if [[ "$args" == "exec $c rm -f "* ]]; then
  exit 0
fi

if [[ "$args" == "cp $c:"* ]]; then
  cp "$SQLITE_BACKUP_SOURCE" "${*: -1}"
  exit 0
fi

if [[ "$args" == "stop $c" || "$args" == "start $c" ]]; then
  exit 0
fi

if [[ "$args" == "run --rm --network none --user root --volumes-from $c -v "* ]]; then
  printf 'sha256=feedface\n'
  exit 0
fi

if [[ "$args" == "logs --since "*" $c" ]]; then
  printf '%s\n' "$WEB_LOGS"
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

# The docker subcommands the stubbed scripts ran, in order, e.g.
# "inspect stop run start inspect logs".
docker_subcommands() {
  local line
  local subcommands=()
  while IFS= read -r line; do
    subcommands+=("${line%% *}")
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

  assert_contains "inspect --format {{.State.Running}} harborstats-web" "$DOCKER_LOG"
  assert_contains "exec harborstats-web sqlite3 -bail -cmd .timeout 5000 /data/harborstats.db VACUUM INTO '/data/.harborstats-backup-" "$DOCKER_LOG"
  assert_contains "exec harborstats-web sqlite3 -bail /data/.harborstats-backup-" "$DOCKER_LOG"
  assert_contains "PRAGMA integrity_check" "$DOCKER_LOG"
  assert_contains "cp harborstats-web:/data/.harborstats-backup-" "$DOCKER_LOG"
  assert_contains "exec harborstats-web rm -f /data/.harborstats-backup-" "$DOCKER_LOG"
  # No compose file or project: the container is found by name.
  assert_not_contains "compose" "$DOCKER_LOG"
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
  assert_not_contains "cp harborstats-web:" "$DOCKER_LOG"
  assert_contains "exec harborstats-web rm -f /data/.harborstats-backup-" "$DOCKER_LOG"
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
  [[ "$output" == *"harborstats-web container is not running"* ]] || fail "Expected not-running message, got: $output"
  assert_not_contains "sqlite3" "$DOCKER_LOG"
  [[ -z "$(find "$BACKUP_DIR" -name 'harborstats-*.db*')" ]] || fail "A failed backup must leave no .db in $BACKUP_DIR"
}

run_backup_requires_existing_web_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  export WEB_EXISTS=0

  set +e
  local output
  output="$(PATH="$STUB_BIN:$PATH" BACKUP_DIR="$BACKUP_DIR" "$REPO_DIR/devops/backup-db.sh" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "backup-db.sh should fail when there is no web container"
  [[ "$output" == *"harborstats-web container is not running"* ]] || fail "Expected not-running message, got: $output"
  assert_not_contains "sqlite3" "$DOCKER_LOG"
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

run_restore_requires_existing_web_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  write_sqlite_fixture "$TEST_DIR/sample.db" "restore fixture"
  export WEB_EXISTS=0

  set +e
  local output
  output="$(printf 'harborstats\n' | PATH="$STUB_BIN:$PATH" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/sample.db" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "restore-db.sh should fail when there is no web container"
  [[ "$output" == *"No harborstats-web container"* ]] || fail "Expected a missing-container message, got: $output"
  assert_equals "inspect" "$(docker_subcommands)" "restore-db.sh must not stop or change anything without a container"
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
  assert_equals "inspect stop run start inspect logs" "$(docker_subcommands)" "restore-db.sh should find the image, stop web, replace the file, start web and wait for it"
  assert_not_contains "compose" "$DOCKER_LOG"
  assert_contains "stop harborstats-web" "$DOCKER_LOG"
  # Same image and same mounts as the app container, so /data is wherever it
  # keeps the database (a bind mount or a volume).
  assert_contains "run --rm --network none --user root --volumes-from harborstats-web -v $abs_backup_path:/restore/harborstats.db:ro sha256:0123456789abcdef sh -euc" "$DOCKER_LOG"
  assert_contains "cp /restore/harborstats.db /data/.harborstats-restore.db" "$DOCKER_LOG"
  assert_contains "chown 1001:1001 /data/.harborstats-restore.db" "$DOCKER_LOG"
  # A bind-mount directory or a volume created outside the image can have a
  # root-owned /data, and SQLite must create its -wal/-shm files there.
  assert_contains "chown 1001:1001 /data" "$DOCKER_LOG"
  assert_contains 'sha256sum /restore/harborstats.db' "$DOCKER_LOG"
  assert_contains 'sha256sum /data/.harborstats-restore.db' "$DOCKER_LOG"
  [[ "$output" == *"sha256=feedface"* ]] || fail "Expected the in-volume checksum in the output, got: $output"
  [[ "$output" == *"[startup] Opened the existing database"* ]] || fail "Expected the startup line in the output, got: $output"
  assert_contains "rm -f /data/harborstats.db-wal /data/harborstats.db-shm" "$DOCKER_LOG"
  assert_contains "mv /data/.harborstats-restore.db /data/harborstats.db" "$DOCKER_LOG"
  assert_contains "start harborstats-web" "$DOCKER_LOG"
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
  export EXPECTED_CONTAINER=hs-from-env
  unset BACKUP_DIR

  local env_backup_dir="$TEST_DIR/from-env"
  cat >"$ENV_FILE" <<EOF
BACKUP_DIR=$env_backup_dir
CONTAINER_NAME=hs-from-env
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
  assert_contains "exec hs-from-env sqlite3 -bail -cmd .timeout 5000 /data/harborstats.db VACUUM INTO " "$DOCKER_LOG"
  assert_not_contains "harborstats-web" "$DOCKER_LOG"

  : >"$DOCKER_LOG"
  write_sqlite_fixture "$TEST_DIR/env-sample.db" "restore fixture from env"

  local restore_output
  if ! restore_output="$(printf 'harborstats\n' | PATH="$STUB_BIN:$PATH" ENV_FILE="$ENV_FILE" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/env-sample.db" 2>&1)"; then
    echo "$restore_output" >&2
    fail "restore-db.sh should load values from ENV_FILE"
  fi

  assert_equals "inspect stop run start inspect logs" "$(docker_subcommands)" "restore-db.sh should run the full restore"
  assert_contains "--volumes-from hs-from-env " "$DOCKER_LOG"
  assert_contains "start hs-from-env" "$DOCKER_LOG"
  assert_not_contains "harborstats-web" "$DOCKER_LOG"
}

run_restore_reports_failed_startup_test() {
  setup_test_dir
  trap cleanup_test_dir RETURN
  write_docker_stub
  write_checksum_stub
  write_sqlite_fixture "$TEST_DIR/sample.db" "restore fixture"
  export WEB_STATE=restarting
  export WEB_LOGS="SqliteError: attempt to write a readonly database"

  set +e
  local output
  output="$(printf 'harborstats\n' | PATH="$STUB_BIN:$PATH" "$REPO_DIR/devops/restore-db.sh" "$TEST_DIR/sample.db" 2>&1)"
  local status=$?
  set -e

  [[ $status -ne 0 ]] || fail "restore-db.sh should fail when web does not start"
  [[ "$output" == *"web did not start"* ]] || fail "Expected a failed-start message, got: $output"
  [[ "$output" == *"attempt to write a readonly database"* ]] || fail "Expected the web log lines, got: $output"
  [[ "$output" != *"Restore complete"* ]] || fail "restore-db.sh must not report success when web does not start"
}

run_dockerfile_test() {
  # The published image: one SQLite app container, migrations applied at
  # startup, the database under /data.
  assert_not_contains 'AS migrator' "$DOCKERFILE"
  assert_contains 'ENV DATABASE_PATH=/data/harborstats.db' "$DOCKERFILE"
  assert_contains 'db/migrations ./db/migrations' "$DOCKERFILE"
  # /data is owned by the app user (uid 1001), which restore-db.sh also enforces.
  assert_contains 'chown nextjs:nodejs /data' "$DOCKERFILE"
  # The preinstall hook runs this script, so the deps stage must copy it first.
  assert_contains 'COPY scripts/check-node-version.ts ./scripts/' "$DOCKERFILE"
  # backup-db.sh runs the sqlite3 CLI inside the web container.
  assert_contains 'apk add --no-cache sqlite' "$DOCKERFILE"
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
  run_backup_requires_existing_web_test
  run_restore_rejects_bad_confirmation_test
  run_restore_rejects_checksum_mismatch_test
  run_restore_rejects_non_sqlite_file_test
  run_restore_requires_existing_web_test
  run_restore_test
  run_restore_reports_failed_startup_test
  run_env_file_test
  run_dockerfile_test
  run_migration_scripts_exit_nonzero_test
  echo "backup-restore tests passed"
}

main "$@"
