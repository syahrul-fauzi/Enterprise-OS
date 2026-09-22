#!/usr/bin/env bash
set -euo pipefail

SERVICE_UNIT_PATH="${EOS_STAGING_SERVICE_UNIT_PATH:-/etc/systemd/system/eos-staging-cloudflared.service}"
STARTER_PATH="${EOS_STAGING_STARTER_PATH:-/usr/local/bin/eos-staging-cloudflared-start}"
ENV_DIR="${EOS_STAGING_ENV_DIR:-/etc/eos-staging}"
ENV_FILE="${EOS_STAGING_ENV_FILE:-${ENV_DIR}/cloudflared.env}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd systemctl
require_cmd install
require_cmd cloudflared

if [[ ! -f "$STARTER_PATH" ]]; then
  install -d -m 755 "$(dirname "$STARTER_PATH")"
  install -m 755 /dev/null "$STARTER_PATH"
  cat >"$STARTER_PATH" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ -f /etc/eos-staging/cloudflared.env ]]; then
  set -a
  source /etc/eos-staging/cloudflared.env
  set +a
fi
if [[ -z "${EOS_STAGING_TUNNEL_TOKEN:-}" || "${EOS_STAGING_TUNNEL_TOKEN}" == "replace-me" ]]; then
  echo "EOS_STAGING_TUNNEL_TOKEN is not installed" >&2
  exit 64
fi
exec /usr/bin/cloudflared --no-autoupdate tunnel run --token "$EOS_STAGING_TUNNEL_TOKEN"
EOF
fi

install -d -m 700 "$ENV_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
  cat >"$ENV_FILE" <<'EOF'
EOS_STAGING_TUNNEL_TOKEN=replace-me
EOF
  chmod 600 "$ENV_FILE"
fi

if [[ ! -f "$SERVICE_UNIT_PATH" ]]; then
  install -d -m 755 "$(dirname "$SERVICE_UNIT_PATH")"
  cat >"$SERVICE_UNIT_PATH" <<'EOF'
[Unit]
Description=cloudflared tunnel for EOS staging
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/eos-staging-cloudflared-start
Restart=on-failure
RestartSec=5s
TimeoutStartSec=15

[Install]
WantedBy=multi-user.target
EOF
fi

systemctl daemon-reload
echo "Bootstrap files verified."
echo "Install EOS_STAGING_TUNNEL_TOKEN into $ENV_FILE, then run:"
echo "  systemctl enable --now eos-staging-cloudflared.service"
echo "  bash infra/staging/cloudflare/health-check.sh"
echo "  bash infra/staging/cloudflare/public-acceptance.sh"
