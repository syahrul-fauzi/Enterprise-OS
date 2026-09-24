#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/infra/staging/.env"
DEFAULT_ENV_FILE="$ROOT_DIR/infra/staging/.env.example"

if [[ ! -f "$ENV_FILE" ]]; then
  ENV_FILE="$DEFAULT_ENV_FILE"
fi

# Export environment variables dari file .env untuk layanan lokal
export $(grep -v '^#' "$ENV_FILE" | xargs)

# Jalankan hanya layanan dependency yang dibutuhkan (PostgreSQL saja) untuk local development
echo "=== Starting local dependency services (PostgreSQL only) for STAGING:LOCAL ==="
cd "$ROOT_DIR"
docker compose \
  --env-file "$ENV_FILE" \
  -f "$ROOT_DIR/infra/staging/compose.yaml" \
  up -d postgres redis

# Tunggu PostgreSQL siap
echo "=== Waiting for PostgreSQL to be ready ==="
sleep 10

# Jalankan database migration (jika ada)
echo "=== Running database migrations ==="
pnpm turbo run db:migrate || echo "⚠️ No migration script found, skipping..."

# Jalankan HANYA package yang BENAR-BENAR dibutuhkan untuk GOLDEN SPINE PATH
# Filter eksplisit: hanya web (apps/web) dan api (apps/api) agar tidak menjalankan semua package
# Tambahkan NODE_OPTIONS untuk meningkatkan memory limit agar tidak terjadi error 137 (SIGKILL)
echo "=== Starting ONLY core web+api services (excluding ALL non-essential packages) for STAGING:LOCAL ==="
NODE_OPTIONS="--max-old-space-size=4096" npx turbo run dev --concurrency 32 --filter "web" --filter "api"