#!/usr/bin/env bash
set -euo pipefail

echo "EOS STAGING SMOKE TEST"
echo "────────────────────────────────────────"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

FAILED=0

test_service_health() {
  local service_name="$1"
  local container_name="$2"
  
  echo -n "Checking $service_name health... "
  if docker inspect --format='{{.State.Health.Status}}' "$container_name" | grep -q "healthy"; then
    echo "PASS"
    return 0
  else
    echo "FAIL"
    FAILED=1
    return 1
  fi
}

test_http_endpoint() {
  local endpoint="$1"
  local expected_status="$2"
  local description="$3"
  
  echo -n "Checking $description ($endpoint)... "
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint" || echo "000")
  if [ "$status" = "$expected_status" ]; then
    echo "PASS (HTTP $status)"
    return 0
  else
    echo "FAIL (HTTP $status, expected $expected_status)"
    FAILED=1
    return 1
  fi
}

test_database_connection() {
  echo -n "Checking PostgreSQL connection... "
  if docker exec eos-staging-postgres pg_isready -U "$POSTGRES_USER" -d eos_identity >/dev/null 2>&1; then
    echo "PASS"
    return 0
  else
    echo "FAIL"
    FAILED=1
    return 1
  fi
}

test_redis_connection() {
  echo -n "Checking Redis connection... "
  if docker exec eos-staging-redis redis-cli ping | grep -q "PONG"; then
    echo "PASS"
    return 0
  else
    echo "FAIL"
    FAILED=1
    return 1
  fi
}

test_api_health() {
  echo -n "Checking API health endpoint... "
  local response
  response=$(curl -s http://localhost:3001/api/health || echo "fail")
  if echo "$response" | grep -q "ok\|healthy"; then
    echo "PASS"
    return 0
  else
    echo "FAIL (response: $response)"
    FAILED=1
    return 1
  fi
}

test_web_health() {
  echo -n "Checking Web frontend health... "
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "000")
  if [ "$status" = "200" ]; then
    echo "PASS (HTTP $status)"
    return 0
  else
    echo "FAIL (HTTP $status, expected 200)"
    FAILED=1
    return 1
  fi
}

test_caddy_health() {
  echo -n "Checking Caddy reverse proxy... "
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/api/health || echo "000")
  if [ "$status" = "200" ]; then
    echo "PASS (HTTP $status)"
    return 0
  else
    echo "FAIL (HTTP $status, expected 200)"
    FAILED=1
    return 1
  fi
}

test_container_running() {
  local container_name="$1"
  local description="$2"
  
  echo -n "Checking $description container... "
  if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
    echo "PASS"
    return 0
  else
    echo "FAIL"
    FAILED=1
    return 1
  fi
}

echo "Container Status Checks:"
test_container_running "eos-staging-postgres" "PostgreSQL"
test_container_running "eos-staging-redis" "Redis"
test_container_running "eos-staging-api" "API"
test_container_running "eos-staging-web" "Web Frontend"
test_container_running "eos-staging-caddy" "Caddy Reverse Proxy"

echo ""
echo "Service Health Checks:"
test_service_health "PostgreSQL" "eos-staging-postgres"
test_service_health "Redis" "eos-staging-redis"
test_service_health "API" "eos-staging-api"
test_service_health "Web Frontend" "eos-staging-web"
test_service_health "Caddy" "eos-staging-caddy"

echo ""
echo "Database & Dependency Checks:"
test_database_connection
test_redis_connection

echo ""
echo "HTTP Endpoint Checks:"
test_api_health
test_web_health
test_caddy_health

echo ""
echo "────────────────────────────────────────"
if [ "$FAILED" -eq 0 ]; then
  echo "ALL SMOKE TESTS PASSED!"
  exit 0
else
  echo "SOME SMOKE TESTS FAILED!"
  exit 1
fi