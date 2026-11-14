#!/usr/bin/env bash
set -euo pipefail

echo "EOS STAGING DEPLOYMENT (WITH CACHE)"
echo "────────────────────────────────────────"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "1. Loading environment variables..."
if [ ! -f .env ]; then
  echo "ERROR: .env file not found in staging directory"
  exit 1
fi
set -a
source .env
set +a

echo "2. Stopping existing staging containers..."
docker compose down --remove-orphans

echo "3. Building staging images WITH CACHE..."
docker compose build

echo "4. Starting staging stack..."
docker compose up -d

echo "5. Waiting for services to be healthy..."
timeout 300 bash -c '
until docker compose ps --format json | jq -r ".State.Health.Status" | grep -q "healthy"; do
  echo "Waiting for services to be healthy..."
  sleep 10
done
'

echo "6. Running smoke tests..."
bash smoke-test.sh

echo "7. Deployment completed successfully!"
echo "Staging environment is now available at http://localhost"