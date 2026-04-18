#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$REPO_DIR/devops/docker-compose.yml"

echo "==> Pulling latest changes..."
git -C "$REPO_DIR" pull

echo "==> Starting database..."
docker compose -f "$COMPOSE_FILE" up -d db

echo "==> Running migrations..."
docker compose -f "$COMPOSE_FILE" run --rm migrate

echo "==> Building and starting web..."
docker compose -f "$COMPOSE_FILE" up --build -d web

echo "==> Done."
