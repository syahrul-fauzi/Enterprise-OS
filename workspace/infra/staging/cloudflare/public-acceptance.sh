#!/usr/bin/env bash
set -euo pipefail

declare -a CHECKS=(
  "services-id.com:/products/services-id:/products/services-id/requirements:Services.ID"
  "lawyershub.id:/products/lawyershub:/products/lawyershub/requirements:LawyersHub"
  "indonesialawyersclub.id:/products/ilc:/products/ilc/requirements:Indonesia Lawyers Club"
)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd curl

check_body() {
  local url="$1"
  local expected="$2"
  local body
  body="$(curl -fsSL "$url")"
  grep -q "$expected" <<<"$body"
  grep -q "Requirement Preview" <<<"$body" || grep -q "Requirement Workspace" <<<"$body"
}

echo "EOS STAGING EXPOSURE"
echo "────────────────────────────"

all_ok=1
for entry in "${CHECKS[@]}"; do
  IFS=":" read -r host preview_path requirement_path expected <<<"$entry"

  status="$(curl -o /dev/null -sS -w '%{http_code}' "https://${host}/")"
  if [[ "$status" =~ ^(200|301|302)$ ]] \
    && check_body "https://${host}${preview_path}" "$expected" \
    && check_body "https://${host}${requirement_path}" "$expected" \
    && check_body "https://${host}/requirements" "Requirement Workspace"; then
    case "$host" in
      services-id.com)
        echo "services-id.com             PASS"
        ;;
      lawyershub.id)
        echo "lawyershub.id               PASS"
        ;;
      indonesialawyersclub.id)
        echo "indonesialawyersclub.id     PASS"
        ;;
    esac
  else
    all_ok=0
    case "$host" in
      services-id.com)
        echo "services-id.com             FAIL"
        ;;
      lawyershub.id)
        echo "lawyershub.id               FAIL"
        ;;
      indonesialawyersclub.id)
        echo "indonesialawyersclub.id     FAIL"
        ;;
    esac
  fi
done

if [[ "$all_ok" == "1" ]]; then
  echo
  echo "Product surface             PASS"
  echo "Requirement Workspace       PASS"
  echo
  echo "Overall                     PASS"
else
  echo
  echo "Product surface             FAIL"
  echo "Requirement Workspace       FAIL"
  echo
  echo "Overall                     FAIL"
  exit 1
fi
