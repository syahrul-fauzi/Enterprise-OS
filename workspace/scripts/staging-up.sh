#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/staging/compose.yaml"
ENV_FILE="$ROOT_DIR/infra/staging/.env"
DEFAULT_ENV_FILE="$ROOT_DIR/infra/staging/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE="$DEFAULT_ENV_FILE"
fi

docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --build
