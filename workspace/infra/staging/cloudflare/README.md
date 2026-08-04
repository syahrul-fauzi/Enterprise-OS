# EOS Staging Cloudflare Exposure

This directory captures the proven public exposure contract for the EOS staging
environment.

Current live topology:

```text
Cloudflare
  -> eos-staging tunnel
  -> http://127.0.0.1:3005
  -> EOS staging origin bridge
  -> https://127.0.0.1:443
  -> eos-staging Caddy
  -> apps/web
  -> product preview
  -> Requirement Workspace
```

Public hostnames served by the live `eos-staging` tunnel:

- `services-id.com`
- `lawyershub.id`
- `indonesialawyersclub.id`

Legacy note:

- `lawyers-hub-intake-mvp` is now deprecated for product staging exposure.
- Do not delete or rotate the legacy tunnel in this contract.
- Removal must happen only after a separate, explicit cleanup task.

## What lives in Git

This directory stores:

- immutable exposure contract
- bootstrap instructions for a new VPS
- connector and origin health checks
- public acceptance checks for the three proven product domains

This directory does **not** store:

- Cloudflare API tokens
- tunnel tokens
- `cert.pem`
- service credentials

## Runtime secret contract

The connector token must be injected at runtime through:

```text
/etc/eos-staging/cloudflared.env
```

Required key:

```dotenv
EOS_STAGING_TUNNEL_TOKEN=...
```

## Bootstrap flow

On a new VPS:

1. Install `cloudflared`
2. Install the connector unit and starter script
3. Inject `EOS_STAGING_TUNNEL_TOKEN` into `/etc/eos-staging/cloudflared.env`
4. Start `eos-staging-cloudflared.service`
5. Ensure the origin bridge at `127.0.0.1:3005` is healthy
6. Run `health-check.sh`
7. Run `public-acceptance.sh`

## Live SSOT captured in this contract

- Tunnel name: `eos-staging`
- Tunnel target: `http://127.0.0.1:3005`
- Origin bridge listens on `:3005`
- Bridge forwards:
  - `services-id.com` -> `/products/services-id`
  - `lawyershub.id` -> `/products/lawyershub`
  - `indonesialawyersclub.id` -> `/products/ilc`

## Verification

Use:

```bash
bash infra/staging/cloudflare/health-check.sh
bash infra/staging/cloudflare/public-acceptance.sh
```

The public acceptance check verifies:

- tunnel and connector health
- origin bridge health
- public HTTPS reachability
- product identity
- `Requirement Preview`
- shared `/requirements` route
- no timeout
- no `5xx`
