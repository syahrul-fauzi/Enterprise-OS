#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/infra/staging/compose.yaml"
ENV_FILE="$ROOT_DIR/infra/staging/.env"
DEFAULT_ENV_FILE="$ROOT_DIR/infra/staging/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE="$DEFAULT_ENV_FILE"
fi

# Pre-build all core workspace packages to ensure dist files are available for Docker build
echo "=== Pre-building core workspace packages (REALITY-001 staging deployment) ==="
cd "$ROOT_DIR"
pnpm turbo run build \
  --filter=@repo/core-runtime \
  --filter=@repo/core-kernel \
  --filter=@repo/presentation-entities \
  --filter=@repo/presentation-ui-system \
  --filter=@repo/presentation-hooks

# Start staging environment with updated local dist files
echo "=== Starting staging environment with Docker Compose ==="
docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  up -d --build