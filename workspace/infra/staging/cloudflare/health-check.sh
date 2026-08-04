#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${EOS_STAGING_TUNNEL_SERVICE:-eos-staging-cloudflared.service}"
ORIGIN_PORT="${EOS_STAGING_ORIGIN_PORT:-3005}"
ORIGIN_HOST="${EOS_STAGING_ORIGIN_HOST:-127.0.0.1}"

declare -a HOSTS=(
  "services-id.com:/products/services-id:Services.ID"
  "lawyershub.id:/products/lawyershub:LawyersHub"
  "indonesialawyersclub.id:/products/ilc:Indonesia Lawyers Club"
)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd systemctl
require_cmd curl
require_cmd ss

echo "EOS STAGING EXPOSURE"
echo "────────────────────────────"

if systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "Tunnel          eos-staging       PASS"
  echo "Connector       connected         PASS"
else
  echo "Tunnel          eos-staging       FAIL"
  echo "Connector       connected         FAIL"
  exit 1
fi

if ss -lntp | grep -q ":${ORIGIN_PORT}\\b"; then
  echo "Origin          ${ORIGIN_HOST}:${ORIGIN_PORT}    PASS"
else
  echo "Origin          ${ORIGIN_HOST}:${ORIGIN_PORT}    FAIL"
  exit 1
fi

for entry in "${HOSTS[@]}"; do
  IFS=":" read -r host path expected <<<"$entry"
  body="$(curl -fsS "http://${ORIGIN_HOST}:${ORIGIN_PORT}${path}" -H "Host: ${host}")"
  if grep -q "$expected" <<<"$body" && grep -q "Requirement Preview" <<<"$body"; then
    echo "${host}    PASS"
  else
    echo "${host}    FAIL"
    exit 1
  fi
done
